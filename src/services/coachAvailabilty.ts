import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { CoachAvailability } from '../types';

const COLLECTION = 'coachAvailability';

export async function getCoachAvailability(
  coachId: string
): Promise<CoachAvailability | null> {
  const ref = doc(db, COLLECTION, coachId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data() as CoachAvailability;
}

export async function upsertCoachAvailability(
  coachId: string,
  weeklyAvailability: CoachAvailability['weeklyAvailability']
) {
  const ref = doc(db, COLLECTION, coachId);

  await setDoc(
    ref,
    {
      coachId,
      weeklyAvailability,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
