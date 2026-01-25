// src/services/userProfile.ts
import { doc, getDoc, serverTimestamp, setDoc, updateDoc,  } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppUserProfile, User, PlayerKeyStats } from '../types';

const USERS_COLLECTION = 'users';

export async function getUserProfile(uid: string): Promise<AppUserProfile | null> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as AppUserProfile;
}

export async function createUserProfile(uid: string, user: User): Promise<void> {
  await upsertUserProfile(uid, user);
}

export async function updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);

  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  } as any);
}

export async function updatePlayerKeyStats(uid: string, keyStats: PlayerKeyStats): Promise<void> {
  await updateUserProfile(uid, { keyStats });
}

export async function upsertUserProfile(uid: string, user: User): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);

  const nowIso = new Date().toISOString();

  const basePayload: Partial<AppUserProfile> = {
    uid,
    ...user,
    updatedAt: nowIso,
    updatedAtServer: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        ...basePayload,
        createdAt: nowIso,
        createdAtServer: serverTimestamp(),
      } as any,
      { merge: true }
    );
    return;
  }

  await setDoc(ref, basePayload as any, { merge: true });
}
