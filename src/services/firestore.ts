// src/services/firestore.ts
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { PlayerVideoItem, FitnessEntry } from '../types';

export type SessionItem = {
  id: string;
  playerId: string;
  coachId: string;
  title: string;
  coachName: string;
  venue?: string;
  startTimeISO: string; // ISO string
  notes?: string;
  createdAtISO: string;
};

export type FeedbackItem = {
  id: string;
  playerId: string;
  coachId: string;
  title: string;
  bullets: string[];
  createdAtISO: string;
};

const COL_VIDEOS = 'videos';
const COL_FITNESS = 'fitnessEntries';
const COL_SESSIONS = 'sessions';
const COL_FEEDBACK = 'feedback';

// --------------------
// VIDEOS
// --------------------
export async function createVideoForPlayer(params: {
  playerId: string;
  playerName: string;
  coachId: string; // required when sharing
  coachName: string;
  uri: string;
  durationSec?: number;
  uploadedBy: 'player' | 'coach';
  context: 'practice' | 'centre';
}): Promise<void> {
  await addDoc(collection(db, COL_VIDEOS), {
    ...params,
    status: 'shared', // when created here, it is already assigned/shared
    createdAtISO: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
    reviewed: false,
  });
}

export async function listVideosForPlayer(playerId: string): Promise<any[]> {
  const q = query(
    collection(db, COL_VIDEOS),
    where('playerId', '==', playerId),
    orderBy('createdAtISO', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listVideosForCoach(coachId: string): Promise<any[]> {
  const q = query(
    collection(db, COL_VIDEOS),
    where('coachId', '==', coachId),
    orderBy('createdAtISO', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function markVideoReviewed(videoDocId: string, feedback?: string): Promise<void> {
  await updateDoc(doc(db, COL_VIDEOS, videoDocId), {
    reviewed: true,
    feedback: feedback ?? '',
    reviewedAtISO: new Date().toISOString(),
    reviewedAtServer: serverTimestamp(),
  } as any);
}

// --------------------
// FITNESS
// --------------------
export async function addFitnessEntry(params: {
  playerId: string;
  createdBy: 'player' | 'coach';
  description: string;
  sets: number;
  reps: number;
  dateKey: string;   // "YYYY-MM-DD"
  dateLabel: string; // display label
  notes?: string;
}): Promise<void> {
  await addDoc(collection(db, COL_FITNESS), {
    ...params,
    createdAtISO: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
  });
}

export async function listFitnessEntries(playerId: string): Promise<any[]> {
  const q = query(
    collection(db, COL_FITNESS),
    where('playerId', '==', playerId),
    orderBy('createdAtISO', 'desc'),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --------------------
// UPCOMING SESSION + FEEDBACK
// --------------------
export async function getNextUpcomingSession(playerId: string): Promise<SessionItem | null> {
  const nowISO = new Date().toISOString();

  const q = query(
    collection(db, COL_SESSIONS),
    where('playerId', '==', playerId),
    where('startTimeISO', '>=', nowISO),
    orderBy('startTimeISO', 'asc'),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) } as SessionItem;
}

export async function getRecentFeedback(playerId: string): Promise<FeedbackItem | null> {
  const q = query(
    collection(db, COL_FEEDBACK),
    where('playerId', '==', playerId),
    orderBy('createdAtISO', 'desc'),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) } as FeedbackItem;
}
