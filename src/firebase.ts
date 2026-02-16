// src/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {}) as any;
const firebaseConfig = extra.firebase ?? {};


const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// keep your existing helper export
export { serverTimestamp };

export default app;
