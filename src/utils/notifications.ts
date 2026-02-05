// src/utils/notifications.ts
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// ✅ Foreground behavior (new Expo types need banner/list fields too)
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushPrefs = {
  videos?: boolean;
  feedback?: boolean;
  bookings?: boolean;
};

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device.");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Notification permission not granted.");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("Push token skipped: missing extra.eas.projectId");
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return token;
  } catch (e) {
    console.log("registerForPushNotificationsAsync error:", e);
    return null;
  }
}

export async function saveExpoPushTokenToUser(uid: string, token: string) {
  if (!uid || !token) return;

  await setDoc(
    doc(db, "users", uid),
    {
      expoPushToken: token,
      expoPushTokenUpdatedAtMs: Date.now(),
    },
    { merge: true }
  );
}

export async function saveNotificationPrefs(uid: string, prefs: PushPrefs) {
  if (!uid) return;

  await setDoc(
    doc(db, "users", uid),
    {
      notificationPrefs: {
        videos: prefs.videos ?? true,
        feedback: prefs.feedback ?? true,
        bookings: prefs.bookings ?? true,
      },
    },
    { merge: true }
  );
}

export async function initPushForUser(uid: string) {
  // Always safe to set prefs
  await saveNotificationPrefs(uid, { videos: true, feedback: true, bookings: true });

  // Token is optional
  const token = await registerForPushNotificationsAsync();
  if (token) await saveExpoPushTokenToUser(uid, token);

  return token;
}

export function attachNotificationListeners(
  onNavigate: (screen: string, params?: Record<string, unknown>) => void
) {
  const receivedSub = Notifications.addNotificationReceivedListener(() => {});

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response?.notification?.request?.content?.data ?? {}) as Record<string, unknown>;
    const screen = typeof data.screen === "string" ? data.screen : "";
    const params =
      (data.params && typeof data.params === "object" ? (data.params as Record<string, unknown>) : undefined);

    if (screen) onNavigate(screen, params);
  });

  return () => {
    try { receivedSub.remove(); } catch {}
    try { responseSub.remove(); } catch {}
  };
}