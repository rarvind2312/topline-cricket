// src/screens/PlayerVideosScreen.body.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';

import type { RootStackParamList, PlayerVideoItem } from '../types';
import { styles } from '../styles/styles';

import { useAuth } from '../context/AuthContext';
import { db, storage, serverTimestamp } from '../firebase';

import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';

type PlayerVideosProps = NativeStackScreenProps<RootStackParamList, 'PlayerVideos'>;
const TOPLINE_LOGO = require('../../assets/topline-cricket-image.jpg');
const MAX_VIDEO_SECONDS = 120;
const MAX_PRACTICE_VIDEOS = 1;

// RN-friendly uri -> blob (more reliable than fetch(uri) for iOS file:// videos)
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('uriToBlob failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}


type CoachLite = { id: string; name: string };

const PlayerVideosScreen: React.FC<PlayerVideosProps> = ({ navigation }) => {
  const { firebaseUser, profile } = useAuth();

  const uid = firebaseUser?.uid || '';

  const playerName = useMemo(() => {
    const fn = (profile as any)?.firstName || '';
    const ln = (profile as any)?.lastName || '';
    const full = `${fn} ${ln}`.trim();
    return full || (profile as any)?.email || 'Player';
  }, [profile]);

  // ✅ Coaches loaded ONLY from Firestore users(role=coach)
  const [coaches, setCoaches] = useState<CoachLite[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  const [videos, setVideos] = useState<PlayerVideoItem[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string>(''); // bulk assign dropdown

  const [recentShared, setRecentShared] = useState<any[]>([]);
const [loadingRecentShared, setLoadingRecentShared] = useState(false);

const [coachVideos, setCoachVideos] = useState<any[]>([]);

useEffect(() => {
if (!firebaseUser?.uid) return;

const q = query(
collection(db, 'videos'),
where('uploadedBy', '==', 'coach'),
where('playerId', '==', firebaseUser.uid),
limit(5)
);

const unsub = onSnapshot(q, (snap) => {
const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
setCoachVideos(list);
});

return () => unsub();
}, [firebaseUser?.uid]);

  useEffect(() => {
    const loadCoaches = async () => {
      try {
        setLoadingCoaches(true);

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'coach'), limit(50));
        const snap = await getDocs(q);

        const list: CoachLite[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const name =
            `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() ||
            data.email ||
            'Coach';
          return { id: d.id, name };
        });

        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCoaches(list);
      } catch (e) {
        console.log('Load coaches error:', e);
      } finally {
        setLoadingCoaches(false);
      }
    };

    loadCoaches();
  }, []);

  useEffect(() => {
  if (!uid) return;

  setLoadingRecentShared(true);

  const refCol = collection(db, 'videos');

  // ✅ Only videos submitted by THIS player
  const q = query(
    refCol,
    where('playerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(5)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data: any = d.data();

        const createdAtLabel =
          data?.createdAt?.toDate?.()
            ? data.createdAt.toDate().toLocaleDateString()
            : '';

        return {
          id: d.id,
          coachName: data.coachName || '',
          skill: data.skill || 'Practice',
          status: data.status || 'submitted',
          createdAtLabel,
          videoUrl: data.videoUrl || '',
          storagePath: data.storagePath || '',
        };
      });

      setRecentShared(list);
      setLoadingRecentShared(false);
    },
    (err) => {
      console.log('recentShared videos listener error:', err);
      setLoadingRecentShared(false);
    }
  );

  return () => unsub();
}, [uid]);

  const coachNameById = (coachId: string) => {
    return coaches.find((c) => c.id === coachId)?.name ?? '';
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your media library.');
      return;
    }

    if (videos.length >= MAX_PRACTICE_VIDEOS) {
      Alert.alert(
        'Upload limit reached',
        `You can upload a maximum of ${MAX_PRACTICE_VIDEOS} practice videos.`
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const durationSec =
      typeof asset.duration === 'number' ? asset.duration / 1000 : undefined;

    if (durationSec && durationSec > MAX_VIDEO_SECONDS) {
      Alert.alert('Video too long', 'Please choose a short practice video (max 2 minutes).');
      return;
    }

    setVideos((prev) => [
      ...prev,
      {
        uri: asset.uri,
        durationSec: durationSec ? Math.round(durationSec) : undefined,
        uploadedBy: 'player',
        context: 'practice',
        coachId: '',       // always a string
        status: 'draft',   // draft until confirmed
        // @ts-ignore (we keep this extra flag without changing your types file)
        acceptedPolicy: false,
      } as any,
    ]);

    Alert.alert('Uploaded', 'Now select a coach and tap Confirm to share.');
  };

  const setCoachForVideo = (index: number, coachId: string) => {
    setVideos((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        if (v.status === 'shared') return v; // Once shared, don’t allow changing coach
        return { ...v, coachId };
      })
    );
  };

  // Bulk assign: apply ONLY to draft videos, never overwrite shared videos
  const assignCoachToAllVideos = (coachId: string) => {
    setSelectedCoachId(coachId);

    setVideos((prev) =>
      prev.map((v: any) => {
        if (v.status === 'shared') return v;
        return { ...v, coachId };
      })
    );
  };

  const toggleAcceptPolicy = (index: number) => {
    setVideos((prev: any[]) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        if (v.status === 'shared') return v;
        return { ...v, acceptedPolicy: !v.acceptedPolicy };
      })
    );
  };

  // ✅ Confirm now really uploads to Firebase Storage + creates Firestore doc
  const confirmShareVideo = async (index: number) => {
    const v: any = videos[index];
    if (!v) return;

    if (v.status === 'shared') {
      Alert.alert('Already shared', 'This video is already shared and cannot be changed.');
      return;
    }

    if (!firebaseUser?.uid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    if (!v.coachId) {
      Alert.alert('Select a coach', 'Please choose a coach before confirming.');
      return;
    }

    if (!v.acceptedPolicy) {
      Alert.alert(
        'Confirmation required',
        'Please accept responsibility before sharing this video with the coach.'
      );
      return;
    }

    try {
      const blob = await uriToBlob(v.uri);

      const fileName = `vid_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
      const storagePath = `playerVideos/${firebaseUser.uid}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: 'video/mp4',
      });

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          () => {},
          (err) => reject(err),
          () => resolve()
        );
      });

      const downloadUrl = await getDownloadURL(storageRef);

      try {
        (blob as any)?.close?.();
      } catch {}

      const coachName = coachNameById(v.coachId);

      await addDoc(collection(db, 'videos'), {
        playerId: firebaseUser.uid,
        playerName,
        coachId: v.coachId,
        coachName: coachName || '',
        videoUrl: downloadUrl,
        storagePath,
        status: 'submitted',
        createdAt: serverTimestamp(),
        // keep optional fields simple for now (you can add later)
        title: '',
        skill: 'Practice',
        notes: '',
      });

      Alert.alert('Shared', 'Video uploaded and shared with the selected coach.');

      setVideos((prev: any[]) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                status: 'shared',
                // store these locally too (keeps UX same)
                videoUrl: downloadUrl,
                coachName: coachName || '',
                storagePath,
              }
            : item
        )
      );
    } catch (e: any) {
      console.log('Upload failed:', e);
      Alert.alert(
        'Upload failed',
        e?.message || e?.code || 'Firebase Storage: An unknown error occurred. (storage/unknown)'
      );
    }
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <Text style={styles.sectionTitle}>Practice Videos</Text>

<Image source={TOPLINE_LOGO} style={[styles.headerLogo, {alignSelf:'flex-end'}]} />
        <Text style={styles.playerWelcomeSubText}>
          Upload 1 short practice clip (max 2 minutes) for your coach to review.
        </Text>

        {/* 1) VIDEO UPLOAD SPACE */}
        <TouchableOpacity style={styles.videoUploadCard} onPress={pickVideo}>
          <Text style={styles.videoUploadHint}>+ Upload practice video</Text>
          <Text style={styles.videoUploadMeta}>
            {videos.length}/{MAX_PRACTICE_VIDEOS} uploaded
          </Text>
        </TouchableOpacity>

        {/* empty vs list */}
        {videos.length === 0 ? (
          <Text style={styles.playerCardEmptyText}>
            No videos uploaded yet. Start by adding your first practice clip.
          </Text>
        ) : (
          <View style={{ marginTop: 16 }}>
            {videos.map((video: any, index) => {
              const isShared = video.status === 'shared';
              const coachName = coachNameById(video.coachId);

              return (
                <View key={index} style={styles.videoItemCard}>
                  <Text style={styles.videoItemTitle}>Practice Video {index + 1}</Text>

                  {video.durationSec ? (
                    <Text style={styles.videoItemMeta}>Duration: {video.durationSec}s</Text>
                  ) : null}

                  <Video
                    source={{ uri: video.uri }}
                    style={styles.videoPlayer}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                  />

                  <Text style={styles.assignLabel}>Select coach for review</Text>

                  <View style={styles.pickerCard}>
                    <Picker
                      enabled={!isShared && !loadingCoaches}
                      selectedValue={video.coachId}
                      onValueChange={(value) => setCoachForVideo(index, String(value))}
                    >
                      <Picker.Item
                        label={loadingCoaches ? 'Loading coaches…' : 'Select a coach...'}
                        value=""
                      />
                      {coaches.map((c) => (
                        <Picker.Item key={c.id} label={c.name} value={c.id} />
                      ))}
                    </Picker>
                  </View>

                  {/* TEXT ONLY highlighted (not the component box) */}
                  {video.coachId ? (
                    <Text style={styles.selectedRow}>
                      <Text style={styles.selectedLabel}>Selected: </Text>
                      <Text style={styles.selectedCoachName}>{coachName}</Text>
                    </Text>
                  ) : null}

                  {/* ✅ Responsibility checkbox (no new styles) */}
                  {!isShared ? (
                    <TouchableOpacity
                      onPress={() => toggleAcceptPolicy(index)}
                      style={{ marginTop: 10 }}
                    >
                      <Text style={styles.playerWelcomeSubText}>
                        {video.acceptedPolicy ? '☑ ' : '☐ '}
                        I confirm this is my cricket training video. I take responsibility for the
                        content. Inappropriate uploads may lead to my account being removed.
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {isShared ? (
                    <View style={styles.sharedPill}>
                      <Text style={styles.sharedPillText}>✅ Shared</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.confirmButton,
                        !video.coachId || !video.acceptedPolicy ? { opacity: 0.5 } : null,
                      ]}
                      disabled={!video.coachId || !video.acceptedPolicy}
                      onPress={() => confirmShareVideo(index)}
                    >
                      <Text style={styles.confirmButtonText}>Confirm & Share</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

          {coachVideos.length > 0 && (
        <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionTitle}>Videos from Coach</Text>

        {coachVideos.map((v, i) => (
        <View key={v.id} style={styles.videoItemCard}>
        <Text style={styles.videoItemTitle}>
        Coach: {v.coachName}
        </Text>

        <Video
        source={{ uri: v.videoUrl }}
        style={styles.videoPlayer}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        />

        {v.notes ? (
        <Text style={styles.playerWelcomeSubText}>
        ￼
         {v.notes}
        </Text>
        ) : null}
        </View>
        ))}
        </View>
        )}

    

        {/* Back to dashboard (same styles you already use for buttons) */}
        <View style={{ marginTop: 18 }}>
         <TouchableOpacity
                   style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
                   onPress={() => navigation.goBack()}
                 >
                   <Text style={styles.secondaryButtonText}>⬅ Return to Player Dashboard</Text>
                 </TouchableOpacity>
        </View>

        <View style={{ marginTop: 18 }}>
  <Text style={styles.sectionTitle}>Recent Shared</Text>

  {loadingRecentShared ? (
    <Text style={styles.playerWelcomeSubText}>Loading…</Text>
  ) : recentShared.length === 0 ? (
    <Text style={styles.playerCardEmptyText}>
      No shared videos yet. Upload and confirm a video to send to your coach.
    </Text>
  ) : (
    <View style={{ marginTop: 10 }}>
      {recentShared.map((v) => (
        <View key={v.id} style={styles.videoItemCard}>
          <Text style={styles.videoItemTitle}>
            {v.createdAtLabel || '—'}  •  {v.skill}
          </Text>
          <Text style={styles.videoItemMeta}>
            Coach: {v.coachName || '—'}
          </Text>
          <Text style={styles.videoItemMeta}>
            Status: {String(v.status || '').toUpperCase()}
          </Text>
        </View>
      ))}
    </View>
  )}
</View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default PlayerVideosScreen;
