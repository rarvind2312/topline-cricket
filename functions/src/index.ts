/* eslint-disable max-len */

import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {Expo} from "expo-server-sdk";
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const expo = new Expo();

type AnyRecord = Record<string, unknown>;
const MAX_REQUESTS_PER_DAY = 5;
const MAX_TOKENS_PER_DAY = 5000;
const MAX_OUTPUT_TOKENS = 300;

/**
 * Coerce unknown Firestore data into a plain object map.
 * @param {unknown} data Firestore doc data
 * @return {Record<string, unknown>} safe object map
 */
function asRecord(data: unknown): AnyRecord {
  if (data && typeof data === "object") return data as AnyRecord;
  return {};
}

/**
 * Safe getter for string fields.
 * @param {Record<string, unknown>} obj source object
 * @param {string} key field name
 * @return {string} string value (or "")
 */
function getString(obj: AnyRecord, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

/**
 * Safe getter for string/number fields coerced to string.
 * @param {Record<string, unknown>} obj source object
 * @param {string} key field name
 * @return {string} value as string (or "")
 */
function getValueAsString(obj: AnyRecord, key: string): string {
  const v = obj[key];
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

/**
 * Convert "HH:MM" to minutes since 00:00 (or -1 if invalid).
 * @param {string} hhmm time string
 * @return {number} minutes
 */
function timeToMinutes(hhmm: string): number {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

/**
 * Build epoch ms from "YYYY-MM-DD" + "HH:mm" in server local time.
 * @param {string} dateStr date
 * @param {string} timeStr time
 * @return {number} epoch ms or 0
 */
function parseSessionStartMs(dateStr: string, timeStr: string): number {
  const [y, mo, da] = String(dateStr || "").split("-").map(Number);
  const [h, mi] = String(timeStr || "").split(":").map(Number);
  if (!y || !mo || !da || Number.isNaN(h) || Number.isNaN(mi)) return 0;
  const d = new Date(y, mo - 1, da, h, mi, 0, 0);
  const ms = d.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Build display name from profile.
 * @param {Record<string, unknown>} obj profile
 * @param {string} fallback fallback label
 * @return {string} display name
 */
function displayName(obj: AnyRecord, fallback = "User"): string {
  const fn = getString(obj, "firstName").trim();
  const ln = getString(obj, "lastName").trim();
  const full = `${fn} ${ln}`.trim();
  return full || getString(obj, "email") || fallback;
}

/**
 * Require callable admin.
 * @param {any} request callable request
 */
function requireAdminRequest(request: any): void {
  const isAdmin = Boolean(request?.auth?.token?.admin);
  if (!request?.auth || !isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

/**
 * Merge existing custom claims with next values.
 * @param {Record<string, unknown>|undefined} existing existing claims
 * @param {Record<string, unknown>} next next claims
 * @return {Record<string, unknown>} merged claims
 */
function mergeClaims(
  existing: Record<string, unknown> | undefined,
  next: Record<string, unknown>
): Record<string, unknown> {
  return {...(existing || {}), ...next};
}

/**
 * Update /users and /publicUsers role for admin changes.
 * @param {string} uid target user uid
 * @param {string} newRole role to set (admin/coach/player/parent)
 * @param {boolean} storeRoleBefore store previous role if needed
 * @return {Promise<void>}
 */
async function upsertUserRole(uid: string, newRole: string, storeRoleBefore: boolean) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = asRecord(userSnap.exists ? userSnap.data() : null);
  const currentRole = getString(userData, "role").trim().toLowerCase();

  const updates: AnyRecord = {
    updatedAtMs: Date.now(),
    updatedAtServer: FieldValue.serverTimestamp(),
  };

  if (newRole) updates["role"] = newRole;

  if (storeRoleBefore && currentRole && currentRole !== "admin" && !getString(userData, "roleBeforeAdmin")) {
    updates["roleBeforeAdmin"] = currentRole;
  }

  await userRef.set(updates, {merge: true});

  const publicRef = db.collection("publicUsers").doc(uid);
  const publicUpdates: AnyRecord = {
    role: newRole,
    updatedAtMs: Date.now(),
  };
  const firstName = getString(userData, "firstName").trim();
  const lastName = getString(userData, "lastName").trim();
  const avatarUrl = getString(userData, "avatarUrl").trim();
  if (firstName) publicUpdates["firstName"] = firstName;
  if (lastName) publicUpdates["lastName"] = lastName;
  if (avatarUrl) publicUpdates["avatarUrl"] = avatarUrl;
  await publicRef.set(publicUpdates, {merge: true});
}

/**
 * Calculate age from DOB (supports dd/mm/yyyy or ISO-like).
 * @param {string} dobStr date of birth
 * @return {number|null} age in years
 */
function ageFromDob(dobStr: string): number | null {
  const raw = (dobStr || "").trim();
  if (!raw) return null;
  let d: Date | null = null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (m) {
    d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  } else {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) d = new Date(parsed);
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const mDiff = now.getMonth() - d.getMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < d.getDate())) age -= 1;
  return age > 0 && age < 120 ? age : null;
}

/**
 * Rough token estimate (chars / 4).
 * @param {string} text input
 * @return {number} estimated tokens
 */
function estimateTokens(text: string): number {
  const len = String(text || "").length;
  return Math.max(1, Math.ceil(len / 4));
}

/**
 * Coerce a Firestore timestamp / number / string into ms.
 * @param {unknown} v timestamp-like
 * @return {number} epoch ms or 0
 */
function toMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const parsed = Date.parse(v);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  // Firestore Timestamp-like
  const anyV = v as AnyRecord;
  if (typeof anyV.toMillis === "function") return anyV.toMillis() as number;
  if (typeof anyV.seconds === "number") return anyV.seconds * 1000;
  return 0;
}

/**
 * Send Expo push notification safely.
 *
 * @param {string} expoPushToken Expo push token
 * @param {string} title Notification title
 * @param {string} body Notification body
 * @param {Record<string, unknown>} data Deep link payload
 * @return {Promise<void>}
 */
async function sendPush(
  expoPushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.log("Invalid Expo push token", expoPushToken);
    return;
  }

  await expo.sendPushNotificationsAsync([
    {to: expoPushToken, sound: "default", title, body, data},
  ]);
}

/**
 * 🤖 Ask AI (player + coach)
 * Uses GPT-4o (text only) with minimal context summary.
 *
 * @return {Function} callable https function
 */
export const askAiForPlayer = onCall({secrets: ["OPENAI_API_KEY"]}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Please sign in again.");
  }

  const question = String(request.data?.question || "").trim();
  if (!question) {
    throw new HttpsError("invalid-argument", "Please enter a question.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "OpenAI API key is not set.");
  }

  // Closed beta allowlist (server-side)
  const testerSnap = await db.collection("betaTesters").doc(uid).get();
  const tester = asRecord(testerSnap.data());
  const testerEnabled = testerSnap.exists && tester["enabled"] !== false;
  if (!testerEnabled) {
    throw new HttpsError("permission-denied", "AI is in closed beta.");
  }

  const callerSnap = await db.collection("users").doc(uid).get();
  const caller = asRecord(callerSnap.data());
  const role = (getString(caller, "role") || "player").trim().toLowerCase();
  const isCoach = role === "coach";

  const videoId = String(request.data?.videoId || "").trim();
  let targetPlayerId = uid;

  if (isCoach) {
    if (!videoId) {
      throw new HttpsError("invalid-argument", "Please select a player video first.");
    }
    const videoSnap = await db.collection("videos").doc(videoId).get();
    if (!videoSnap.exists) {
      throw new HttpsError("not-found", "Selected video not found.");
    }
    const video = asRecord(videoSnap.data());
    const coachId = getString(video, "coachId");
    if (coachId !== uid) {
      throw new HttpsError("permission-denied", "You are not allowed to use this video.");
    }
    targetPlayerId = getString(video, "playerId");
    if (!targetPlayerId) {
      throw new HttpsError("failed-precondition", "Selected video has no player.");
    }
  }

  const playerSnap = await db.collection("users").doc(targetPlayerId).get();
  const player = asRecord(playerSnap.data());

  const playerName = displayName(player, "Player");
  const playerAge = ageFromDob(getString(player, "dob"));
  const playerLevel = getString(player, "playerLevel");
  const playerType = getString(player, "playerType");
  const heightCm = getValueAsString(player, "heightCm");
  const weightKg = getValueAsString(player, "weightKg");
  const batSize = getValueAsString(player, "batSize");
  const batWeight = getValueAsString(player, "batWeight");
  const battingHand = getString(player, "battingHand");
  const bowlingHand = getString(player, "bowlingHand");
  const padsSize = getValueAsString(player, "padsSize");

  const requesterName = displayName(caller, isCoach ? "Coach" : "Player");
  const coachLevel = getString(caller, "coachLevel");
  const coachSpecRaw = caller["coachSpecialisation"];
  const coachSpec = Array.isArray(coachSpecRaw)? coachSpecRaw.map((s) => String(s)).filter(Boolean).join(", "): "";

  const profileLines: string[] = [];
  profileLines.push(`Requester: role=${role} name=${requesterName}`);
  if (isCoach) {
    const coachDetails = [
      coachLevel ? `level=${coachLevel}` : "",
      coachSpec ? `specialisation=${coachSpec}` : "",
    ].filter(Boolean).join(", ");
    if (coachDetails) profileLines.push(`Coach profile: ${coachDetails}`);
  }

  const playerDetails = [
    `name=${playerName}`,
    playerAge ? `age=${playerAge}` : "",
    playerLevel ? `level=${playerLevel}` : "",
    playerType ? `type=${playerType}` : "",
    heightCm ? `heightCm=${heightCm}` : "",
    weightKg ? `weightKg=${weightKg}` : "",
    batSize ? `batSize=${batSize}` : "",
    batWeight ? `batWeight=${batWeight}` : "",
    battingHand ? `battingHand=${battingHand}` : "",
    bowlingHand ? `bowlingHand=${bowlingHand}` : "",
    padsSize ? `padsSize=${padsSize}` : "",
  ].filter(Boolean).join(", ");
  profileLines.push(`Player profile: ${playerDetails || "unknown"}`);

  // Recent fitness entries (summary)
  const fitnessSnap = await db
    .collection("fitnessEntries")
    .where("playerId", "==", targetPlayerId)
    .orderBy("createdAtMs", "desc")
    .limit(5)
    .get();

  const fitnessLines = fitnessSnap.docs.map((d) => {
    const data = asRecord(d.data());
    const createdMs =
      toMillis(data["createdAtMs"]) ||
      toMillis(data["createdAt"]) ||
      toMillis(data["createdAtLabel"]);
    const createdLabel = createdMs ? new Date(createdMs).toISOString().slice(0, 10) : "recent";

    const source = getString(data, "source") || "player";
    const status = getString(data, "status") || "assigned";
    const shared = !!data["sharedToCoach"];
    const origin =
      source === "coach" ? "coach-assigned" : (shared ? "shared" : "self");

    const drillsRaw = Array.isArray(data["drills"]) ? data["drills"] : [];
    const drills = drillsRaw
      .slice(0, 5)
      .map((dr: any) => {
        const name = typeof dr?.drill === "string" ? dr.drill.trim() : "";
        if (!name) return "";
        const reps = dr?.reps ? ` reps:${String(dr.reps).trim()}` : "";
        const sets = dr?.sets ? ` sets:${String(dr.sets).trim()}` : "";
        return `${name}${reps}${sets}`.trim();
      })
      .filter(Boolean)
      .join(", ");

    return `${createdLabel} • ${origin} • ${status}: ${drills || "No drills"}`;
  });

  // Recent coach feedback (videos + fitness)
  let videoDocs: AnyRecord[] = [];
  try {
    const videosSnap = await db
      .collection("videos")
      .where("playerId", "==", targetPlayerId)
      .orderBy("createdAtMs", "desc")
      .limit(30)
      .get();
    videoDocs = videosSnap.docs.map((d) => ({id: d.id, ...(d.data() as AnyRecord)}));
  } catch (e: any) {
    const msg = String(e?.message || "");
    const code = Number(e?.code || 0);
    if (code === 9 || msg.includes("requires an index")) {
      console.log("askAiForPlayer: videos index missing, skipping video feedback.");
      videoDocs = [];
    } else {
      throw e;
    }
  }

  const feedbackCandidates: {text: string; ts: number}[] = [];

  for (const d of videoDocs) {
    const data = asRecord(d);
    const uploadedBy = getString(data, "uploadedBy").trim().toLowerCase();

    if (uploadedBy === "player") {
      const status = getString(data, "status").trim().toLowerCase();
      const feedback = getString(data, "feedback").trim();
      if (status === "reviewed" && feedback) {
        const ts =
          toMillis(data["reviewedAt"]) ||
          toMillis(data["reviewedAtMs"]) ||
          toMillis(data["createdAtMs"]) ||
          toMillis(data["createdAt"]);
        feedbackCandidates.push({text: feedback, ts});
      }
    }

    if (uploadedBy === "coach") {
      const notes = getString(data, "notes").trim();
      if (notes) {
        const ts =
          toMillis(data["createdAtMs"]) || toMillis(data["createdAt"]);
        feedbackCandidates.push({text: notes, ts});
      }
    }
  }

  for (const d of fitnessSnap.docs) {
    const data = asRecord(d.data());
    const coachNotes = getString(data, "coachReviewNotes").trim();
    if (!coachNotes) continue;
    const ts =
      toMillis(data["coachReviewedAtMs"]) ||
      toMillis(data["coachReviewedAt"]) ||
      toMillis(data["completedAtMs"]) ||
      toMillis(data["createdAtMs"]) ||
      toMillis(data["createdAt"]);
    feedbackCandidates.push({text: coachNotes, ts});
  }

  feedbackCandidates.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const latestFeedback = feedbackCandidates[0]?.text || "";

  const contextSummary = [
    profileLines.join("\n"),
    `Recent fitness entries:\n${fitnessLines.length ? fitnessLines.join("\n") : "None"}`,
    `Recent coach feedback:\n${latestFeedback || "None"}`,
  ].join("\n");

  const systemPrompt = [
    "You are Topline AI Coach, a cricket training assistant.",
    "Use ONLY the provided context; do NOT invent facts.",
    "You have not watched or analyzed any video; do NOT claim you saw any video.",
    "Tailor advice to age, skill level, role, handedness, height/weight when provided.",
    "If details are missing, keep suggestions general and ask one brief follow-up question.",
    "Avoid medical diagnosis; include a simple safety note.",
    "Format exactly:",
    "Short answer: 2-4 lines.",
    "Improvement cues:",
    "- bullet 1",
    "- bullet 2",
    "- bullet 3",
    "Suggested drills:",
    "- bullet 1",
    "- bullet 2",
    "- bullet 3",
    "Safety note: one line.",
    "Follow-up question: optional, one line max.",
  ].join("\n");

  const userPrompt = `Context:\n${contextSummary}\n\nQuestion:\n${question}`;

  // Daily usage gating (requests + estimated tokens)
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const usageRef = db.collection("aiUsageDaily").doc(`${uid}_${dayKey}`);
  let remaining = 0;

  const estimatedInputTokens = estimateTokens(systemPrompt + "\n" + userPrompt);
  const estimatedMaxTokens = estimatedInputTokens + MAX_OUTPUT_TOKENS;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const requests = snap.exists ? Number(snap.get("requests") || 0) : 0;
      const tokens = snap.exists ? Number(snap.get("tokens") || 0) : 0;
      if (requests >= MAX_REQUESTS_PER_DAY) {
        throw new HttpsError("resource-exhausted", "Daily request limit reached.");
      }
      if (tokens + estimatedMaxTokens > MAX_TOKENS_PER_DAY) {
        throw new HttpsError("resource-exhausted", "Daily token limit reached.");
      }
      const nextRequests = requests + 1;
      remaining = Math.max(0, MAX_REQUESTS_PER_DAY - nextRequests);
      tx.set(
        usageRef,
        {
          userId: uid,
          day: dayKey,
          requests: nextRequests,
          tokens,
          updatedAtMs: Date.now(),
        },
        {merge: true}
      );
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.log("askAiForPlayer daily usage error:", e);
    throw new HttpsError("internal", "Usage check failed.");
  }

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: [{type: "input_text", text: systemPrompt}],
        },
        {
          role: "user",
          content: [{type: "input_text", text: userPrompt}],
        },
      ],
      temperature: 0.4,
      max_output_tokens: MAX_OUTPUT_TOKENS,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.log("OpenAI error:", errText);
    throw new HttpsError("internal", "AI request failed.");
  }

  const data = await resp.json();
  let answer = "";

  if (typeof data?.output_text === "string") {
    answer = data.output_text;
  } else if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        const t = part?.type;
        const text = part?.text;
        if ((t === "output_text" || t === "text") && typeof text === "string") {
          answer += (answer ? "\n" : "") + text;
        }
      }
    }
  }

  answer = String(answer || "").trim();
  if (!answer) {
    throw new HttpsError("internal", "AI returned an empty response.");
  }

  // Update daily token usage (best-effort)
  const usage = data?.usage || {};
  const usageTotal =
    typeof usage.total_tokens === "number" ? usage.total_tokens : 0;
  const usageInput =
    typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
  const usageOutput =
    typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
  const estimatedOutputTokens = estimateTokens(answer);
  let tokensUsed = usageTotal;
  if (!tokensUsed) {
    const sum = usageInput + usageOutput;
    tokensUsed = sum > 0 ? sum : (estimatedInputTokens + estimatedOutputTokens);
  }

  try {
    await usageRef.set(
      {
        userId: uid,
        day: dayKey,
        tokens: FieldValue.increment(tokensUsed),
        updatedAtMs: Date.now(),
      },
      {merge: true}
    );
  } catch (e) {
    console.log("askAiForPlayer token usage update failed:", e);
  }

  await db.collection("aiConversations").add({
    userId: uid,
    role,
    contextSummary,
    question,
    answer,
    createdAtMs: Date.now(),
  });

  return {answer, remaining};
});

/**
 * ✅ Admin: grant admin claim by email (callable)
 *
 * @return {Function} callable
 */
export const grantAdminByEmail = onCall(async (request) => {
  requireAdminRequest(request);

  const email = String(request.data?.email || "").trim().toLowerCase();
  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required.");
  }

  const auth = getAuth();
  const user = await auth.getUserByEmail(email);

  const mergedClaims = mergeClaims(user.customClaims || {}, {admin: true});
  await auth.setCustomUserClaims(user.uid, mergedClaims);

  await upsertUserRole(user.uid, "admin", true);

  return {ok: true, uid: user.uid};
});

/**
 * ✅ Admin: revoke admin claim by email (callable)
 *
 * @return {Function} callable
 */
export const revokeAdminByEmail = onCall(async (request) => {
  requireAdminRequest(request);

  const email = String(request.data?.email || "").trim().toLowerCase();
  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required.");
  }

  const auth = getAuth();
  const user = await auth.getUserByEmail(email);

  const mergedClaims = mergeClaims(user.customClaims || {}, {admin: false});
  await auth.setCustomUserClaims(user.uid, mergedClaims);

  const userRef = db.collection("users").doc(user.uid);
  const userSnap = await userRef.get();
  const userData = asRecord(userSnap.exists ? userSnap.data() : null);

  const currentRole = getString(userData, "role").trim().toLowerCase();
  const roleBefore = getString(userData, "roleBeforeAdmin").trim().toLowerCase();
  const canRestore =
    currentRole === "admin" && (roleBefore === "coach" || roleBefore === "player" || roleBefore === "parent");

  const updates: AnyRecord = {
    updatedAtMs: Date.now(),
    updatedAtServer: FieldValue.serverTimestamp(),
  };

  let nextRole = currentRole || "";

  if (canRestore) {
    updates["role"] = roleBefore;
    updates["roleBeforeAdmin"] = FieldValue.delete();
    nextRole = roleBefore;
  }

  await userRef.set(updates, {merge: true});

  if (nextRole) {
    const publicRef = db.collection("publicUsers").doc(user.uid);
    await publicRef.set({role: nextRole, updatedAtMs: Date.now()}, {merge: true});
  }

  return {ok: true, uid: user.uid};
});

/**
 * ✅ Admin: send emergency closure notification to all users
 *
 * @return {Function} callable
 */
export const sendEmergencyClosureNotification = onCall(async (request) => {
  requireAdminRequest(request);

  const message = String(request.data?.message || "").trim();
  if (!message) {
    throw new HttpsError("invalid-argument", "Message is required.");
  }

  const title = "Emergency Closure";
  const usersSnap = await db.collection("users").get();

  let sent = 0;
  for (const d of usersSnap.docs) {
    const user = asRecord(d.data());
    const token = getString(user, "expoPushToken");
    if (!token) continue;
    try {
      await sendPush(token, title, message, {
        screen: "PlayerDashboard",
        type: "closure",
      });
      sent += 1;
    } catch (e) {
      console.log("sendEmergencyClosureNotification failed for", d.id, e);
    }
  }

  return {ok: true, sent};
});

/**
 * 🔔 Player uploads a practice video → notify coach
 *
 * @return {Function} Firestore trigger
 */
export const notifyCoachOnPlayerVideo = onDocumentCreated(
  "videos/{videoId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const video = asRecord(snap.data());
    if (getString(video, "uploadedBy") !== "player") return;

    const coachId = getString(video, "coachId");
    if (!coachId) return;

    const coachSnap = await db.collection("users").doc(coachId).get();
    const coach = asRecord(coachSnap.data());
    const token = getString(coach, "expoPushToken");
    if (!token) return;

    const playerName = getString(video, "playerName") || "Player";

    await sendPush(token, "New Practice Video", `${playerName} shared a video`, {
      screen: "CoachVideoReview",
      videoId: snap.id,
    });
  }
);

/**
 * 🔔 Coach uploads a coaching video → notify player
 *
 * @return {Function} Firestore trigger
 */
export const notifyPlayerOnCoachVideo = onDocumentCreated(
  "videos/{videoId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const video = asRecord(snap.data());
    if (getString(video, "uploadedBy") !== "coach") return;

    const playerId = getString(video, "playerId");
    if (!playerId) return;

    const playerSnap = await db.collection("users").doc(playerId).get();
    const player = asRecord(playerSnap.data());
    const token = getString(player, "expoPushToken");
    if (!token) return;

    await sendPush(token, "New Coaching Video", "Your coach shared a coaching video", {
      screen: "PlayerCoachingVideos",
      videoId: snap.id,
    });
  }
);


/**
 * 🔔 Coach reviews a player video → notify player
 * Fires on UPDATE when status changes to "reviewed"
 *
 * @return {Function} Firestore trigger
 */
export const notifyPlayerOnFeedback = onDocumentUpdated(
  "videos/{videoId}",
  async (event) => {
    const afterSnap = event.data?.after;
    const beforeSnap = event.data?.before;
    if (!afterSnap || !beforeSnap) return;

    const after = asRecord(afterSnap.data());
    const before = asRecord(beforeSnap.data());

    if (getString(after, "uploadedBy") !== "player") return;

    const beforeStatus = getString(before, "status");
    const afterStatus = getString(after, "status");
    const becameReviewed = beforeStatus !== "reviewed" && afterStatus === "reviewed";
    if (!becameReviewed) return;

    const playerId = getString(after, "playerId");
    if (!playerId) return;

    const playerSnap = await db.collection("users").doc(playerId).get();
    const player = asRecord(playerSnap.data());
    const token = getString(player, "expoPushToken");
    if (!token) return;

    await sendPush(token, "Coach Feedback Received", "Your coach has reviewed your video", {
      screen: "PlayerVideos",
      videoId: afterSnap.id,
    });
  }
);

/**
 * 🔔 Coach shares markups on a player video → notify player
 * Fires on UPDATE when markupsShared flips to true
 *
 * @return {Function} Firestore trigger
 */
export const notifyPlayerOnMarkupsShared = onDocumentUpdated(
  "videos/{videoId}",
  async (event) => {
    const afterSnap = event.data?.after;
    const beforeSnap = event.data?.before;
    if (!afterSnap || !beforeSnap) return;

    const after = asRecord(afterSnap.data());
    const before = asRecord(beforeSnap.data());

    if (getString(after, "uploadedBy") !== "player") return;

    const beforeShared = Boolean(before["markupsShared"]);
    const afterShared = Boolean(after["markupsShared"]);
    if (beforeShared || !afterShared) return;

    const playerId = getString(after, "playerId");
    if (!playerId) return;

    const playerSnap = await db.collection("users").doc(playerId).get();
    const player = asRecord(playerSnap.data());
    const token = getString(player, "expoPushToken");
    if (!token) return;

    const coachName = getString(after, "coachName") || "Coach";

    await sendPush(
      token,
      "Video Markups Shared",
      `${coachName} shared markups on your video`,
      {
        screen: "PlayerVideos",
        videoId: afterSnap.id,
      }
    );
  }
);

/**
 * ✅ Booking notifications
 * 1) Player raises booking request → notify coach
 *
 * @return {Function} Firestore trigger
 */
export const notifyCoachOnBookingRequest = onDocumentCreated(
  "sessionRequests/{reqId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const req = asRecord(snap.data());

    const status = getString(req, "status").toLowerCase();
    if (status !== "requested") return;

    const coachId = getString(req, "coachId");
    const date = getString(req, "date");
    const slotStart = getString(req, "slotStart");
    const slotEnd = getString(req, "slotEnd");
    if (!coachId || !date || !slotStart || !slotEnd) {
      await snap.ref.update({
        status: "declined",
        coachMessage: "Requested slot is invalid.",
        updatedAtMs: Date.now(),
      });
      return;
    }

    const availDocId = `${coachId}_${date}`;
    const availSnap = await db.collection("coachAvailability").doc(availDocId).get();
    const availData = asRecord(availSnap.exists ? availSnap.data() : null);
    const slotsRaw = availData["slots"];
    const reqStartM = timeToMinutes(slotStart);
    const reqEndM = timeToMinutes(slotEnd);
    const hasMatch = Array.isArray(slotsRaw) && slotsRaw.some((s: any) => {
      const sStart = timeToMinutes(String(s?.start || ""));
      const sEnd = timeToMinutes(String(s?.end || ""));
      const isBooked = Boolean(s?.isBooked);
      return !isBooked && sStart >= 0 && sEnd >= 0 && sStart <= reqStartM && sEnd >= reqEndM;
    });

    if (!hasMatch) {
      await snap.ref.update({
        status: "declined",
        coachMessage: "Requested slot is no longer available.",
        updatedAtMs: Date.now(),
      });
      return;
    }

    const coachSnap = await db.collection("users").doc(coachId).get();
    const coach = asRecord(coachSnap.data());
    const token = getString(coach, "expoPushToken");
    if (!token) return;

    const playerName = getString(req, "playerName") || "Player";

    await sendPush(token, "New Session Request", `${playerName} requested a session`, {
      screen: "CoachBookingRequests",
      requestId: snap.id,
    });
  }
);

/**
 * ✅ Booking notifications
 * 2/3/4) Coach confirms/declines/counters → notify player
 *
 * @return {Function} Firestore trigger
 */
export const notifyPlayerOnBookingUpdate = onDocumentUpdated(
  "sessionRequests/{reqId}",
  async (event) => {
    const afterSnap = event.data?.after;
    const beforeSnap = event.data?.before;
    if (!afterSnap || !beforeSnap) return;

    const after = asRecord(afterSnap.data());
    const before = asRecord(beforeSnap.data());

    const afterStatus = getString(after, "status");
    const beforeStatus = getString(before, "status");
    if (!afterStatus || afterStatus === beforeStatus) return;

    const playerId = getString(after, "playerId");
    if (!playerId) return;

    if (!["accepted", "declined", "countered"].includes(afterStatus)) return;

    const playerSnap = await db.collection("users").doc(playerId).get();
    const player = asRecord(playerSnap.data());
    const token = getString(player, "expoPushToken");
    if (!token) return;

    const title = "Session Update";
    const body = "Your session request was updated.";
    await sendPush(token, title, body, {
      screen: "PlayerDashboard",
      requestId: afterSnap.id,
      status: afterStatus,
    });
  }
);

/**
 * ✅ Booking sync
 * When a request is accepted, create a session + mark availability booked.
 *
 * @return {Function} Firestore trigger
 */
export const syncSessionOnBookingAccepted = onDocumentUpdated(
  "sessionRequests/{reqId}",
  async (event) => {
    const afterSnap = event.data?.after;
    const beforeSnap = event.data?.before;
    if (!afterSnap || !beforeSnap) return;

    const after = asRecord(afterSnap.data());
    const before = asRecord(beforeSnap.data());

    const afterStatus = getString(after, "status").toLowerCase();
    const beforeStatus = getString(before, "status").toLowerCase();
    if (afterStatus !== "accepted" || beforeStatus === "accepted") return;

    const coachId = getString(after, "coachId");
    const playerId = getString(after, "playerId");
    const date = getString(after, "date");
    const slotStart = getString(after, "slotStart");
    const slotEnd = getString(after, "slotEnd");

    if (!coachId || !playerId || !date || !slotStart || !slotEnd) {
      console.log("syncSessionOnBookingAccepted: missing required fields", {
        reqId: afterSnap.id,
        coachId,
        playerId,
        date,
        slotStart,
        slotEnd,
      });
      return;
    }

    const coachName = getString(after, "coachName") || "Coach";
    const playerName = getString(after, "playerName") || "Player";
    const requestedStartAtMs =
      typeof after["startAtMs"] === "number" ? (after["startAtMs"] as number) : 0;
    const requestedEndAtMs =
      typeof after["endAtMs"] === "number" ? (after["endAtMs"] as number) : 0;
    const startAtMs = requestedStartAtMs || parseSessionStartMs(date, slotStart);
    const endAtMs = requestedEndAtMs || parseSessionStartMs(date, slotEnd);

    // Create session (idempotent)
    const sessionRef = db.collection("sessions").doc(afterSnap.id);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      await sessionRef.set({
        playerId,
        playerName,
        coachId,
        coachName,
        date,
        start: slotStart,
        end: slotEnd,
        status: "upcoming",
        startAtMs: startAtMs || null,
        endAtMs: endAtMs || null,
        createdAtMs: Date.now(),
        createdAtLabel: new Date().toLocaleString(),
        requestId: afterSnap.id,
      });
    } else if (startAtMs && !sessionSnap.get("startAtMs")) {
      await sessionRef.update({
        startAtMs,
        endAtMs: endAtMs || null,
      });
    }

    // Mark availability slot booked (best-effort)
    const availDocId = `${coachId}_${date}`;
    const availRef = db.collection("coachAvailability").doc(availDocId);
    const availSnap = await availRef.get();
    if (!availSnap.exists) return;

    const availData = asRecord(availSnap.data());
    const slotsRaw = availData["slots"];
    if (!Array.isArray(slotsRaw)) return;

    const reqStartM = timeToMinutes(slotStart);
    const reqEndM = timeToMinutes(slotEnd);
    if (reqStartM < 0 || reqEndM <= reqStartM) return;

    let didSplit = false;
    const updated = [];

    for (const s of slotsRaw) {
      const sStart = timeToMinutes(String(s?.start || ""));
      const sEnd = timeToMinutes(String(s?.end || ""));
      const isBooked = Boolean(s?.isBooked);

      if (!isBooked && sStart >= 0 && sEnd >= 0 && sStart <= reqStartM && sEnd >= reqEndM) {
        didSplit = true;
        if (sStart < reqStartM) {
          updated.push({...s, end: slotStart, isBooked: false});
        }
        updated.push({...s, start: slotStart, end: slotEnd, isBooked: true});
        if (reqEndM < sEnd) {
          updated.push({...s, start: slotEnd, end: String(s?.end || ""), isBooked: false});
        }
      } else {
        updated.push(s);
      }
    }

    if (!didSplit) return;

    await availRef.update({
      slots: updated,
      updatedAtMs: Date.now(),
    });
  }
);

/**
 * Backfill / sync users -> publicUsers (SAFE fields only)
 * Run once via HTTPS after deploy.
 *
 * @return {Function} HTTPS handler
 */
const BACKFILL_KEY = "nihcasdnivraakihtirk";
const SEED_BETA_KEY = BACKFILL_KEY;

export const backfillPublicUsers = onRequest(async (req, res) => {
  try {
    const provided = String(req.headers["x-backfill-key"] || "");
    if (provided !== BACKFILL_KEY) {
      res.status(403).send("Forbidden");
      return;
    }

    const usersSnap = await db.collection("users").get();

    let processed = 0;
    let skipped = 0;

    const batchSize = 400;
    let batch = db.batch();
    let ops = 0;

    for (const d of usersSnap.docs) {
      const userId = d.id;
      const u = asRecord(d.data());

      const role = getString(u, "role").trim().toLowerCase();
      const isValidRole = role === "player" || role === "parent" || role === "coach";
      if (!isValidRole) {
        skipped += 1;
        continue;
      }

      const publicRef = db.collection("publicUsers").doc(userId);

      batch.set(
        publicRef,
        {
          firstName: getString(u, "firstName").trim(),
          lastName: getString(u, "lastName").trim(),
          role,
          playerType: getString(u, "playerType"),
          avatarUrl: getString(u, "avatarUrl"),
          updatedAtMs: Date.now(),
        },
        {merge: true}
      );

      processed += 1;
      ops += 1;

      if (ops >= batchSize) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    res.status(200).json({ok: true, processed, skipped});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("backfillPublicUsers error:", msg);
    res.status(500).json({ok: false, error: msg});
  }
});

/**
 * Seed beta testers (auth + users + publicUsers + betaTesters).
 * One-time use: call with x-seed-key header.
 *
 * Body:
 * { testers: [{ email, password, firstName, lastName, role }] }
 */
export const seedBetaTesters = onRequest(async (req, res) => {
  try {
    const provided = String(req.headers["x-seed-key"] || req.query.key || "");
    if (provided !== SEED_BETA_KEY) {
      res.status(403).send("Forbidden");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).send("Use POST");
      return;
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const testers = Array.isArray(body?.testers) ? body.testers : [];
    if (!testers.length) {
      res.status(400).send("Missing testers array.");
      return;
    }

    const auth = getAuth();
    const results: Array<{email: string; uid: string; role: string; created: boolean}> = [];

    for (const t of testers) {
      const email = String(t?.email || "").trim().toLowerCase();
      const password = String(t?.password || "").trim();
      const firstName = String(t?.firstName || "").trim() || "User";
      const lastName = String(t?.lastName || "").trim();
      const roleRaw = String(t?.role || "player").trim().toLowerCase();
      const role = roleRaw === "coach" || roleRaw === "parent" ? roleRaw : "player";

      if (!email || !password) continue;

      let created = false;
      let user;
      try {
        user = await auth.getUserByEmail(email);
      } catch (e: any) {
        user = await auth.createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`.trim(),
          emailVerified: true,
        });
        created = true;
      }

      const uid = user.uid;
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const existing = asRecord(userSnap.data());
      const nowIso = new Date().toISOString();
      const createdAt = getString(existing, "createdAt") || nowIso;

      await userRef.set(
        {
          uid,
          role,
          firstName,
          lastName,
          email,
          createdAt,
          updatedAt: nowIso,
          updatedAtMs: Date.now(),
        },
        {merge: true}
      );

      await db.collection("publicUsers").doc(uid).set(
        {
          firstName,
          lastName,
          role,
          updatedAtMs: Date.now(),
        },
        {merge: true}
      );

      await db.collection("betaTesters").doc(uid).set(
        {
          enabled: true,
          email,
          role,
          addedAtMs: Date.now(),
        },
        {merge: true}
      );

      results.push({email, uid, role, created});
    }

    res.status(200).json({ok: true, count: results.length, results});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("seedBetaTesters error:", msg);
    res.status(500).json({ok: false, error: msg});
  }
});
/**
 * 🔔 Coach assigns fitness drill → notify player
 */
export const notifyPlayerOnFitnessAssigned =
  onDocumentCreated("fitnessEntries/{entryId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const entry = snap.data() as any;

    // only coach-assigned entries
    if (entry.source !== "coach") return;
    if (entry.status !== "assigned") return;
    if (!entry.playerId) return;

    const playerSnap = await db.collection("users").doc(entry.playerId).get();
    const player = playerSnap.data() as any;
    if (!player?.expoPushToken) return;

    await sendPush(
      player.expoPushToken,
      "New Fitness Drill Assigned",
      `${entry.coachName || "Your coach"} assigned a new drill`,
      {
        screen: "PlayerFitness",
        fitnessEntryId: snap.id,
      }
    );
  });
  /**
 * 🔔 Coach confirms booking → notify player
 */
export const notifyPlayerOnSessionConfirmed =
  onDocumentCreated("sessions/{sessionId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const session = snap.data() as any;
    if (session.status !== "upcoming") return;
    if (!session.playerId) return;

    const playerSnap = await db.collection("users").doc(session.playerId).get();
    const player = playerSnap.data() as any;
    if (!player?.expoPushToken) return;

    await sendPush(
      player.expoPushToken,
      "Session Accepted",
      `${session.coachName || "Coach"} Accpeted your session`,
      {
        screen: "PlayerDashboard",
        sessionId: snap.id,
      }
    );
  });

/**
 * 🔔 Lane booking created → notify admin + relevant users
 */
export const notifyOnLaneBookingCreated =
  onDocumentCreated("laneBookings/{bookingId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const booking = asRecord(snap.data());
    const bookingType = getString(booking, "bookingType");
    const laneName = getString(booking, "laneName") || "Lane";
    const date = getString(booking, "date");
    const start = getString(booking, "start");
    const end = getString(booking, "end");
    const playerId = getString(booking, "playerId");
    const coachId = getString(booking, "coachId");
    const playerName = getString(booking, "playerName") || "Player";
    const coachName = getString(booking, "coachName") || "Coach";

    const detail = `${laneName} • ${date} ${start}-${end}`;

    if (playerId) {
      const playerSnap = await db.collection("users").doc(playerId).get();
      const player = asRecord(playerSnap.data());
      const token = getString(player, "expoPushToken");
      if (token) {
        await sendPush(
          token,
          "Lane Booked",
          bookingType === "coaching"? `Lane booked for coaching: ${detail}`: `Lane booked: ${detail}`,
          {
            screen: "PlayerDashboard",
            laneBookingId: snap.id,
          }
        );
      }
    }

    if (bookingType === "coaching" && coachId) {
      const coachSnap = await db.collection("users").doc(coachId).get();
      const coach = asRecord(coachSnap.data());
      const token = getString(coach, "expoPushToken");
      if (token) {
        await sendPush(
          token,
          "Lane Booked",
          `Lane booked for ${playerName}: ${detail}`,
          {
            screen: "CoachDashboard",
            laneBookingId: snap.id,
          }
        );
      }
    }

    const adminsSnap = await db.collection("users").where("role", "==", "admin").get();
    const adminBody =
      bookingType === "coaching"? `${coachName} booked ${laneName} for ${playerName} (${date} ${start}-${end})`: `${playerName} booked ${laneName} (${date} ${start}-${end})`;
    for (const d of adminsSnap.docs) {
      const admin = asRecord(d.data());
      const token = getString(admin, "expoPushToken");
      if (!token) continue;
      await sendPush(token, "Lane Booking", adminBody, {
        screen: "AdminLaneBookings",
        laneBookingId: snap.id,
      });
    }

    const sessionId = getString(booking, "sessionId");
    if (sessionId) {
      await db.collection("sessions").doc(sessionId).set(
        {
          laneId: getString(booking, "laneId"),
          laneName: getString(booking, "laneName"),
          laneType: getString(booking, "laneType"),
        },
        {merge: true}
      );
    }
  });

/**
 * 🔔 Lane booking updated → notify player/coach + sync session lane
 */
export const notifyOnLaneBookingUpdated =
  onDocumentUpdated("laneBookings/{bookingId}", async (event) => {
    const afterSnap = event.data?.after;
    const beforeSnap = event.data?.before;
    if (!afterSnap || !beforeSnap) return;

    const after = asRecord(afterSnap.data());
    const before = asRecord(beforeSnap.data());

    const laneIdAfter = getString(after, "laneId");
    const laneIdBefore = getString(before, "laneId");
    const laneNameAfter = getString(after, "laneName");
    const laneNameBefore = getString(before, "laneName");
    const startAfter = getString(after, "start");
    const startBefore = getString(before, "start");
    const endAfter = getString(after, "end");
    const endBefore = getString(before, "end");

    const changed =
      laneIdAfter !== laneIdBefore ||
      laneNameAfter !== laneNameBefore ||
      startAfter !== startBefore ||
      endAfter !== endBefore;
    if (!changed) return;

    const laneLabel = laneNameAfter || laneIdAfter || "Lane";
    const date = getString(after, "date");
    const detail = `${laneLabel} • ${date} ${startAfter}-${endAfter}`;

    const playerId = getString(after, "playerId");
    if (playerId) {
      const playerSnap = await db.collection("users").doc(playerId).get();
      const player = asRecord(playerSnap.data());
      const token = getString(player, "expoPushToken");
      if (token) {
        await sendPush(token, "Lane Updated", `Your lane booking was updated: ${detail}`, {
          screen: "PlayerDashboard",
          laneBookingId: afterSnap.id,
        });
      }
    }

    const coachId = getString(after, "coachId");
    if (coachId) {
      const coachSnap = await db.collection("users").doc(coachId).get();
      const coach = asRecord(coachSnap.data());
      const token = getString(coach, "expoPushToken");
      if (token) {
        await sendPush(token, "Lane Updated", `Lane updated for your session: ${detail}`, {
          screen: "CoachDashboard",
          laneBookingId: afterSnap.id,
        });
      }
    }

    const sessionId = getString(after, "sessionId");
    if (sessionId) {
      await db.collection("sessions").doc(sessionId).set(
        {
          laneId: laneIdAfter,
          laneName: laneNameAfter,
          laneType: getString(after, "laneType"),
        },
        {merge: true}
      );
    }
  });

/**
 * 🔔 Admin notified when a session is booked
 */
export const notifyAdminsOnSessionBooked =
  onDocumentCreated("sessions/{sessionId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const session = asRecord(snap.data());
    if (getString(session, "status") !== "upcoming") return;

    const date = getString(session, "date");
    const start = getString(session, "start");
    const end = getString(session, "end");
    const playerName = getString(session, "playerName") || "Player";
    const coachName = getString(session, "coachName") || "Coach";

    const adminsSnap = await db.collection("users").where("role", "==", "admin").get();
    if (adminsSnap.empty) return;

    const body = `${playerName} booked ${coachName} (${date} ${start}-${end})`;

    for (const d of adminsSnap.docs) {
      const admin = asRecord(d.data());
      const token = getString(admin, "expoPushToken");
      if (!token) continue;
      await sendPush(token, "New Session Booking", body, {
        screen: "AdminAccess",
        sessionId: snap.id,
      });
    }
  });

/**
 * 🔔 Notify player + coach if lane changes on a session
 */

/**
 * 🔔 Session reminders (60min + 30min)
 * Runs every 5 minutes and sends reminders to coach + player.
 */
export const sendSessionReminders = onSchedule("every 5 minutes", async () => {
  const nowMs = Date.now();
  const windowMs = 5 * 60 * 1000;
  const sessionsSnap = await db
    .collection("sessions")
    .where("status", "==", "upcoming")
    .limit(500)
    .get();

  if (sessionsSnap.empty) return;

  const userCache = new Map<string, AnyRecord>();
  const getUser = async (uid: string): Promise<AnyRecord> => {
    if (userCache.has(uid)) return userCache.get(uid) as AnyRecord;
    const snap = await db.collection("users").doc(uid).get();
    const data = asRecord(snap.data());
    userCache.set(uid, data);
    return data;
  };

  const targets = [
    {minutes: 60, field: "reminder60SentAtMs"},
    {minutes: 30, field: "reminder30SentAtMs"},
  ];

  for (const docSnap of sessionsSnap.docs) {
    const session = asRecord(docSnap.data());
    const playerId = getString(session, "playerId");
    const coachId = getString(session, "coachId");
    if (!playerId || !coachId) continue;

    const date = getString(session, "date");
    const start = getString(session, "start");
    const end = getString(session, "end");
    const startAtMs =
      typeof session["startAtMs"] === "number" ? (session["startAtMs"] as number) : parseSessionStartMs(date, start);
    if (!startAtMs) continue;

    const diffMs = startAtMs - nowMs;
    if (diffMs <= 0 || diffMs > 70 * 60 * 1000) continue;

    for (const t of targets) {
      const already = typeof session[t.field] === "number" && (session[t.field] as number) > 0;
      if (already) continue;
      const targetMs = t.minutes * 60 * 1000;
      if (Math.abs(diffMs - targetMs) > windowMs) continue;

      const [coach, player] = await Promise.all([getUser(coachId), getUser(playerId)]);
      const coachToken = getString(coach, "expoPushToken");
      const playerToken = getString(player, "expoPushToken");

      const coachName = getString(session, "coachName") || displayName(coach, "Coach");
      const playerName = getString(session, "playerName") || displayName(player, "Player");

      const timeLabel = start && end ? `${start}-${end}` : start || "soon";
      const title = "Session Reminder";
      const playerBody = `Your session with ${coachName} starts in ${t.minutes} minutes (${timeLabel}).`;
      const coachBody = `Your session with ${playerName} starts in ${t.minutes} minutes (${timeLabel}).`;

      if (playerToken) {
        await sendPush(playerToken, title, playerBody, {
          screen: "PlayerDashboard",
          sessionId: docSnap.id,
        });
      }
      if (coachToken) {
        await sendPush(coachToken, title, coachBody, {
          screen: "CoachDashboard",
          sessionId: docSnap.id,
        });
      }

      await docSnap.ref.update({
        [t.field]: Date.now(),
      });
    }
  }
});
