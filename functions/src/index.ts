/* eslint-disable max-len */

import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {Expo} from "expo-server-sdk";
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const expo = new Expo();

type AnyRecord = Record<string, unknown>;

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

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7); // YYYY-MM (UTC)
  const usageRef = db.collection("aiUsage").doc(`${uid}_${monthKey}`);

  let remaining = 0;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const count = snap.exists ? Number(snap.get("count") || 0) : 0;
      if (count >= 5) {
        throw new HttpsError(
          "resource-exhausted",
          "Monthly free limit reached."
        );
      }
      const next = count + 1;
      remaining = Math.max(0, 5 - next);
      tx.set(
        usageRef,
        {
          userId: uid,
          month: monthKey,
          count: next,
          updatedAtMs: Date.now(),
        },
        {merge: true}
      );
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.log("askAiForPlayer usage error:", e);
    throw new HttpsError("internal", "Usage check failed.");
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
      max_output_tokens: 250,
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

    let title = "Session Update";
    let body = "Your session request was updated.";

    if (afterStatus === "accepted") {
      title = "Session Accepted";
      body = "Your coach Accepted your session request.";
    } else if (afterStatus === "declined") {
      title = "Session Declined";
      body = "Your coach Declined the session request.";
    } else if (afterStatus === "countered") {
      title = "Session Counter Offer";
      body = "Your coach suggested a new time.";
    }

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
        createdAtMs: Date.now(),
        createdAtLabel: new Date().toLocaleString(),
        requestId: afterSnap.id,
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
