/* eslint-disable max-len */

import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onRequest} from "firebase-functions/v2/https";
import {Expo} from "expo-server-sdk";

initializeApp();

const db = getFirestore();
const expo = new Expo();

/**
 * Send Expo push notification safely.
 *
 * @param {string} expoPushToken Expo push token
 * @param {string} title Notification title
 * @param {string} body Notification body
 * @param {Object<string, unknown>} data Deep link payload
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
    {
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data,
    },
  ]);
}

/**
 * 🔔 Player uploads a practice video → notify coach
 */
export const notifyCoachOnPlayerVideo =
onDocumentCreated("videos/{videoId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const video = snap.data() as any;
  if (video.uploadedBy !== "player" || !video.coachId) return;

  const coachSnap = await db.collection("users").doc(String(video.coachId)).get();
  const coach = coachSnap.data() as any;
  if (!coach || !coach.expoPushToken) return;

  await sendPush(
    String(coach.expoPushToken),
    "New Practice Video",
    `${video.playerName || "Player"} shared a video`,
    {
      screen: "CoachVideos",
      videoId: snap.id,
    }
  );
});

/**
 * 🔔 Coach uploads a coaching video → notify player
 */
export const notifyPlayerOnCoachVideo =
onDocumentCreated("videos/{videoId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const video = snap.data() as any;
  if (video.uploadedBy !== "coach" || !video.playerId) return;

  const playerSnap = await db.collection("users").doc(String(video.playerId)).get();
  const player = playerSnap.data() as any;
  if (!player || !player.expoPushToken) return;

  await sendPush(
    String(player.expoPushToken),
    "New Coaching Video",
    "Your coach shared a coaching video",
    {
      screen: "PlayerVideos",
      videoId: snap.id,
    }
  );
});

/**
 * 🔔 Coach reviews a player video → notify player (UPDATED: now fires on UPDATE)
 */
export const notifyPlayerOnFeedback =
onDocumentUpdated("videos/{videoId}", async (event) => {
  const beforeSnap = event.data?.before;
  const afterSnap = event.data?.after;
  if (!beforeSnap || !afterSnap) return;

  const before = beforeSnap.data() as any;
  const after = afterSnap.data() as any;

  // Only for player-uploaded videos
  if (after.uploadedBy !== "player" || !after.playerId) return;

  // Fire only when it transitions into reviewed
  const becameReviewed =
    (before.status !== "reviewed" && after.status === "reviewed") ||
    (before.reviewed !== true && after.reviewed === true);

  if (!becameReviewed) return;

  const playerSnap = await db.collection("users").doc(String(after.playerId)).get();
  const player = playerSnap.data() as any;
  if (!player || !player.expoPushToken) return;

  await sendPush(
    String(player.expoPushToken),
    "Coach Feedback Received",
    "Your coach has reviewed your video",
    {
      screen: "PlayerDashboard",
      videoId: afterSnap.id,
    }
  );
});

/**
 * Backfill / sync users -> publicUsers (SAFE fields only)
 * Run once via HTTPS after deploy.
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
      const u = d.data() as any;

      const role = String(u.role || "").trim().toLowerCase();
      const isValidRole = role === "player" || role === "parent" || role === "coach";

      if (!isValidRole) {
        skipped += 1;
        continue;
      }

      const publicRef = db.collection("publicUsers").doc(userId);

      batch.set(
        publicRef,
        {
          firstName: String(u.firstName || "").trim(),
          lastName: String(u.lastName || "").trim(),
          role,
          playerType: typeof u.playerType === "string" ? u.playerType : "",
          avatarUrl: typeof u.avatarUrl === "string" ? u.avatarUrl : "",
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
  } catch (e: any) {
    console.log("backfillPublicUsers error:", e);
    res.status(500).json({ok: false, error: e?.message || String(e)});
  }
});

