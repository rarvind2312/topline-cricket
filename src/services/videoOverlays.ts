import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { VideoOverlayDoc } from '../types';

export async function saveVideoOverlays(payload: VideoOverlayDoc) {
  const ref = doc(db, 'videoOverlays', payload.videoId);
  await setDoc(ref, payload, { merge: true });
}

export function listenVideoOverlays(
  videoId: string,
  onChange: (docData: VideoOverlayDoc | null) => void
) {
  if (!videoId) {
    onChange(null);
    return () => {};
  }
  const ref = doc(db, 'videoOverlays', videoId);
  return onSnapshot(
    ref,
    (snap) => {
      onChange(snap.exists() ? (snap.data() as VideoOverlayDoc) : null);
    },
    () => onChange(null)
  );
}
