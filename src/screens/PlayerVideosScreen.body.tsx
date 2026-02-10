// src/screens/PlayerVideosScreen.body.tsx
// ✅ PLAYER ONLY:
// - Upload practice video (player -> coach)
// - Recent Shared (player only)
// ❌ NO coaching videos here
// ❌ NO toggle here

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
} from 'firebase/firestore';

import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

import { safeToDate, formatDayDateTime } from '../utils/dateFormatter';
import { fetchCoaches } from '../utils/publicUsers';

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
  const [recentShared, setRecentShared] = useState<any[]>([]);
  const [loadingRecentShared, setLoadingRecentShared] = useState(false);

 // ✅ Coaches loaded ONLY from Firestore publicUsers(role=coach)
useEffect(() => {
  const loadCoaches = async () => {
    try {
      setLoadingCoaches(true);

      const list = await fetchCoaches(50);

      // Map to your existing CoachLite shape
      const mapped: CoachLite[] = list.map((u) => ({
        id: u.id,
        name: u.name, // already role-safe fallback ("Coach")
      }));

      mapped.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCoaches(mapped);
    } catch (e) {
      console.log("Load coaches error:", e);
    } finally {
      setLoadingCoaches(false);
    }
  };

  loadCoaches();
}, []);

  // ✅ Recent Shared: ONLY player uploaded videos
  useEffect(() => {
    if (!uid) return;

    setLoadingRecentShared(true);

    const refCol = collection(db, 'videos');

    const q1 = query(
      refCol,
      where('playerId', '==', uid),
      where('uploadedBy', '==', 'player'), // ✅ strict player-only
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsub = onSnapshot(
      q1,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data: any = d.data();

          const createdDt =
            safeToDate(data?.createdAt) ||
            safeToDate(data?.createdAtMs) ||
            (data?.createdAtLabel ? safeToDate(String(data.createdAtLabel)) : null);

          const createdAtLabel = createdDt ? formatDayDateTime(createdDt) : '';

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
        console.log('recentShared listener error:', err);
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
        coachId: '',
        status: 'draft',
        // @ts-ignore
        acceptedPolicy: false,
      } as any,
    ]);

    Alert.alert('Uploaded', 'Now select a coach and tap Confirm to share.');
  };

  const setCoachForVideo = (index: number, coachId: string) => {
    setVideos((prev) =>
      prev.map((v: any, i: number) => {
        if (i !== index) return v;
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

  // ✅ Upload to Storage + create Firestore doc (uploadedBy=player)
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
        uploadTask.on('state_changed', () => {}, reject, () => resolve());
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

        uploadedBy: 'player',
        context: 'practice',

        videoUrl: downloadUrl,
        storagePath,

        status: 'submitted',
        reviewed: false,
        reviewedAt: null,

        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),

        title: '',
        skill: 'Practice',
        notes: '',
        feedback: '',
      });

      Alert.alert('Shared', 'Video uploaded and shared with the selected coach.');

      setVideos((prev: any[]) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, status: 'shared', videoUrl: downloadUrl, coachName: coachName || '', storagePath }
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
        <Text style={styles.sectionTitle}>My Practice Videos</Text>

       <View style={styles.topRightLogoContainer}>
    <Image source={TOPLINE_LOGO} style={styles.topRightLogo} />
  </View>

        <Text style={styles.playerWelcomeSubText}>
          Upload 1 short practice clip (max 2 minutes) and share it with your coach for review.
        </Text>

        {/* Upload space */}
        <TouchableOpacity style={styles.videoUploadCard} onPress={pickVideo}>
          <Text style={styles.videoUploadHint}>+ Upload practice video</Text>
          <Text style={styles.videoUploadMeta}>
            {videos.length}/{MAX_PRACTICE_VIDEOS} uploaded
          </Text>
        </TouchableOpacity>

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
                      <Picker.Item label={loadingCoaches ? 'Loading coaches…' : 'Select a coach...'} value="" />
                      {coaches.map((c) => (
                        <Picker.Item key={c.id} label={c.name} value={c.id} />
                      ))}
                    </Picker>
                  </View>

                  {video.coachId ? (
                    <Text style={styles.selectedRow}>
                      <Text style={styles.selectedLabel}>Selected: </Text>
                      <Text style={styles.selectedCoachName}>{coachName}</Text>
                    </Text>
                  ) : null}

                  {!isShared ? (
                    <TouchableOpacity onPress={() => toggleAcceptPolicy(index)} style={{ marginTop: 10 }}>
                      <Text style={styles.playerWelcomeSubText}>
                        {video.acceptedPolicy ? '☑ ' : '☐ '}
                        I confirm this is my cricket training video. I take responsibility for the content.
                        Inappropriate uploads may lead to my account being removed.
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

        {/* Recent Shared (player-only) */}
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
              {recentShared.slice(0,3).map((v) => (
                <View key={v.id} style={styles.videoItemCard}>
                  <Text style={styles.videoItemTitle}>
                    {v.createdAtLabel || '—'}  •  {v.skill}
                  </Text>
                  <Text style={styles.videoItemMeta}>Coach: {v.coachName || '—'}</Text>
                  <Text style={styles.videoItemMeta}>
                    Status: {String(v.status || '').toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Back */}
        <View style={{ marginTop: 18 }}>
          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>⬅ Return to Player Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlayerVideosScreen;