// src/screens/CoachVideoReviewScreen.body.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
SafeAreaView,
ScrollView,
Text,
View,
TouchableOpacity,
Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';

import { styles } from '../styles/styles';
import { useAuth } from '../context/AuthContext';
import { db, storage, serverTimestamp } from '../firebase';

import {
addDoc,
collection,
getDocs,
query,
where,
limit,
} from 'firebase/firestore';

import {
ref,
uploadBytesResumable,
getDownloadURL,
} from 'firebase/storage';

const MAX_VIDEO_SECONDS = 120;

// RN-safe
async function uriToBlob(uri: string): Promise<Blob> {
const resp = await fetch(uri);
return await resp.blob();
}

type PlayerLite = { id: string; name: string };

export default function CoachVideoReviewScreen() {
const { firebaseUser, profile } = useAuth();

const coachName = useMemo(() => {
const fn = (profile as any)?.firstName || '';
const ln = (profile as any)?.lastName || '';
return `${fn} ${ln}`.trim() || 'Coach';
}, [profile]);

// 

/* ===============================
COACH → PLAYER VIDEO UPLOAD
=============================== */

const [players, setPlayers] = useState<PlayerLite[]>([]);
const [selectedPlayerId, setSelectedPlayerId] = useState('');
const [pickedVideoUri, setPickedVideoUri] = useState('');
const [notes, setNotes] = useState('');
const [uploading, setUploading] = useState(false);

useEffect(() => {
const loadPlayers = async () => {
try {
const q = query(
collection(db, 'users'),
where('role', '==', 'player'),
limit(50)
);
const snap = await getDocs(q);
const list = snap.docs.map((d) => {
const data = d.data() as any;
const name =
`${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() ||
data.email ||
'Player';
return { id: d.id, name };
});
list.sort((a, b) => a.name.localeCompare(b.name));
setPlayers(list);
} catch (e) {
console.log('Load players error:', e);
}
};
loadPlayers();
}, []);

const pickVideo = async () => {
const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (!perm.granted) {
Alert.alert('Permission required', 'Please allow media access.');
return;
}

const res = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ImagePicker.MediaTypeOptions.Videos,
allowsEditing: false,
quality: 1,
});

if (res.canceled) return;

const asset = res.assets[0];
const duration =
typeof asset.duration === 'number' ? asset.duration / 1000 : 0;

if (duration > MAX_VIDEO_SECONDS) {
Alert.alert('Too long', 'Max 2 minutes allowed.');
return;
}

setPickedVideoUri(asset.uri);
};

const submitCoachVideo = async () => {
if (!firebaseUser?.uid) {
Alert.alert('Not signed in');
return;
}
if (!pickedVideoUri) {
Alert.alert('Pick a video first');
return;
}
if (!selectedPlayerId) {
Alert.alert('Select a player');
return;
}

try {
setUploading(true);

const blob = await uriToBlob(pickedVideoUri);
const fileName = `coach_vid_${Date.now()}.mp4`;
const storagePath = `coachVideos/${firebaseUser.uid}/${fileName}`;
const storageRef = ref(storage, storagePath);

const uploadTask = uploadBytesResumable(storageRef, blob, {
contentType: 'video/mp4',
});

await new Promise<void>((res, rej) => {
uploadTask.on('state_changed', () => {}, rej, () => res());
});

const downloadUrl = await getDownloadURL(storageRef);
(blob as any)?.close?.();

const playerName =
players.find((p) => p.id === selectedPlayerId)?.name || '';

await addDoc(collection(db, 'videos'), {
uploadedBy: 'coach',
coachId: firebaseUser.uid,
coachName,
playerId: selectedPlayerId,
playerName,
videoUrl: downloadUrl,
storagePath,
notes: notes.trim(),
status: 'submitted',
createdAt: serverTimestamp(),
});

Alert.alert('Shared', 'Video sent to player.');
setPickedVideoUri('');
setNotes('');
setSelectedPlayerId('');
} catch (e: any) {
console.log(e);
Alert.alert('Upload failed', e?.message || 'Unknown error');
} finally {
setUploading(false);
}
};

return (
<SafeAreaView style={styles.screenContainer}>
<ScrollView contentContainerStyle={styles.formScroll}>
{/* 
￼
 EXISTING REVIEW UI REMAINS AS IS */}

<Text style={styles.sectionTitle}>Share Training Video</Text>

<TouchableOpacity style={styles.videoUploadCard} onPress={pickVideo}>
<Text style={styles.videoUploadHint}>
{pickedVideoUri ? 'Change Video' : '+ Upload Training Video'}
</Text>
</TouchableOpacity>

{pickedVideoUri ? (
<Video
source={{ uri: pickedVideoUri }}
style={styles.videoPlayer}
useNativeControls
resizeMode={ResizeMode.CONTAIN}
/>
) : null}

<View style={styles.pickerCard}>
<Text style={styles.assignLabel}>Assign to Player</Text>
{players.map((p) => (
<TouchableOpacity
key={p.id}
style={styles.rolePill}
onPress={() => setSelectedPlayerId(p.id)}
>
<Text
style={[
styles.rolePillText,
selectedPlayerId === p.id && styles.rolePillTextActive,
]}
>
{p.name}
</Text>
</TouchableOpacity>
))}
</View>

<TouchableOpacity
style={[
styles.confirmButton,
(!pickedVideoUri || !selectedPlayerId) && { opacity: 0.5 },
]}
disabled={!pickedVideoUri || !selectedPlayerId || uploading}
onPress={submitCoachVideo}
>
<Text style={styles.confirmButtonText}>
{uploading ? 'Uploading…' : 'Send to Player'}
</Text>
</TouchableOpacity>
</ScrollView>
</SafeAreaView>
);
}