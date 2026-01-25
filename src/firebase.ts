// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2zextrJ42baggK36f-PkCGtaFfdwrFK8",
  authDomain: "topline-cricket.firebaseapp.com",
  projectId: "topline-cricket",
  storageBucket: "topline-cricket.firebasestorage.app",
  messagingSenderId: "1059546000366",
  appId: "1:1059546000366:web:cecab29fe1e72bbce07cff"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
