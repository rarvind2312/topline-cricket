// src/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA2zextrJ42baggK36f-PkCGtaFfdwrFK8",
  authDomain: "topline-cricket.firebaseapp.com",
  projectId: "topline-cricket",
  storageBucket: "topline-cricket.firebasestorage.app",
  messagingSenderId: "1059546000366",
  appId: "1:1059546000366:web:cecab29fe1e72bbce07cff"
};


const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// keep your existing helper export
export { serverTimestamp };

export default app;
