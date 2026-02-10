/* eslint-disable max-len */

import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {Expo} from "expo-server-sdk";
import {onRequest} from "firebase-functions/v2/https";

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

    const status = getString(req, "status");
    if (status !== "requested") return;

    const coachId = getString(req, "coachId");
    if (!coachId) return;

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

    const updated = slotsRaw.map((s: any) => {
      const sStart = String(s?.start || "");
      const sEnd = String(s?.end || "");
      if (sStart === slotStart && sEnd === slotEnd) {
        return {...s, isBooked: true};
      }
      return s;
    });

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
