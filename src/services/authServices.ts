// src/services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import type { AppUserProfile, Role } from '../types';
import { upsertUserProfile } from './userProfile';

export async function signUpWithEmail(args: {
  email: string;
  password: string;
  role: Role;
  firstName: string;
  lastName: string;
}): Promise<void> {
  const { email, password, role, firstName, lastName } = args;

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  const nowIso = new Date().toISOString();

  const profile: AppUserProfile = {
    uid,
    role,
    firstName,
    lastName,
    email,
    isNew: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    // optional defaults
    keyStats: undefined,
    playerType: undefined,
    playCricketUrl: undefined,
    consents: undefined,
  };

  await upsertUserProfile(cred.user.uid,profile);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutAuth(): Promise<void> {
  await signOut(auth);
}
