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
  Modal,
  TextInput,
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
import { askAI } from '../services/askAI';
import { updateUserProfile } from '../services/userProfile';


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
  const [askVisible, setAskVisible] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [battingHand, setBattingHand] = useState('');
  const [bowlingHand, setBowlingHand] = useState('');
  const needsProfile =
    !String((profile as any)?.heightCm || '').trim() ||
    !String((profile as any)?.weightKg || '').trim() ||
    !String((profile as any)?.battingHand || '').trim() ||
    !String((profile as any)?.bowlingHand || '').trim();

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

  const openAskAI = () => {
    setAskQuestion('');
    setAskAnswer('');
    setHeightCm(String((profile as any)?.heightCm || ''));
    setWeightKg(String((profile as any)?.weightKg || ''));
    setBattingHand(String((profile as any)?.battingHand || ''));
    setBowlingHand(String((profile as any)?.bowlingHand || ''));
    setAskVisible(true);
  };

  const closeAskAI = () => setAskVisible(false);

  const normalizeHand = (v: string) => {
    const t = v.trim().toUpperCase();
    if (!t) return '';
    if (t.startsWith('R')) return 'RH';
    if (t.startsWith('L')) return 'LH';
    return t;
  };

  const saveAskProfile = async () => {
    if (!uid) return;
    const updates: any = {};
    const currentHeight = String((profile as any)?.heightCm || '').trim();
    const currentWeight = String((profile as any)?.weightKg || '').trim();
    const currentBat = String((profile as any)?.battingHand || '').trim().toUpperCase();
    const currentBowl = String((profile as any)?.bowlingHand || '').trim().toUpperCase();

    const nextHeight = heightCm.trim();
    const nextWeight = weightKg.trim();
    const nextBat = normalizeHand(battingHand);
    const nextBowl = normalizeHand(bowlingHand);

    if (nextHeight && nextHeight !== currentHeight) updates.heightCm = nextHeight;
    if (nextWeight && nextWeight !== currentWeight) updates.weightKg = nextWeight;
    if ((nextBat === 'RH' || nextBat === 'LH') && nextBat !== currentBat) updates.battingHand = nextBat;
    if ((nextBowl === 'RH' || nextBowl === 'LH') && nextBowl !== currentBowl) updates.bowlingHand = nextBowl;

    if (Object.keys(updates).length > 0) {
      try {
        await updateUserProfile(uid, updates);
      } catch (e) {
        console.log('Save AI profile failed (non-blocking):', e);
      }
    }
  };

  const submitAskAI = async () => {
    if (askLoading) return;
    const q = askQuestion.trim();
    if (!q) {
      Alert.alert('Type a question', 'Please enter a question for the AI.');
      return;
    }
    try {
      setAskLoading(true);
      await saveAskProfile();
      const res = await askAI(q);
      setAskAnswer(res.answer || '');
    } catch (e: any) {
      const code = String(e?.code || '');
      if (code.includes('resource-exhausted')) {
        Alert.alert('Limit reached', 'You have used your 5 free questions for this month.');
      } else {
        Alert.alert('Ask AI failed', e?.message || 'Please try again.');
      }
    } finally {
      setAskLoading(false);
    }
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
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.formScroll, { paddingBottom: 120 }]}>
        <View style={styles.topRightLogoContainer}>
          <Image source={TOPLINE_LOGO} style={styles.topRightLogo} />
        </View>

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>🎥</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>My Practice Videos</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

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
        </View>

        {/* Recent Shared (player-only) */}
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>📤</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Recent Shared</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

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

        {/* Ask AI Modal */}
        <Modal visible={askVisible} transparent animationType="fade" onRequestClose={closeAskAI}>
            <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Ask AI</Text>
              <Text style={styles.modalHintText}>
                How to ask: goal + context + timeframe. Example: “RH batter, club level, want better timing in 2 weeks.”
              </Text>
              {needsProfile ? (
                <>
                  <Text style={styles.modalHintText}>
                    Add optional profile details for better tips.
                  </Text>
                  <View style={styles.modalInlineRow}>
                    <TextInput
                      style={styles.modalInlineInput}
                      placeholder="Height (cm)"
                      placeholderTextColor="#9ca3af"
                      value={heightCm}
                      keyboardType="numeric"
                      onChangeText={setHeightCm}
                    />
                    <TextInput
                      style={styles.modalInlineInput}
                      placeholder="Weight (kg)"
                      placeholderTextColor="#9ca3af"
                      value={weightKg}
                      keyboardType="numeric"
                      onChangeText={setWeightKg}
                    />
                  </View>
                  <View style={styles.modalInlineRow}>
                    <TextInput
                      style={styles.modalInlineInput}
                      placeholder="Batting hand (RH/LH)"
                      placeholderTextColor="#9ca3af"
                      value={battingHand}
                      autoCapitalize="characters"
                      maxLength={2}
                      onChangeText={setBattingHand}
                    />
                    <TextInput
                      style={styles.modalInlineInput}
                      placeholder="Bowling hand (RH/LH)"
                      placeholderTextColor="#9ca3af"
                      value={bowlingHand}
                      autoCapitalize="characters"
                      maxLength={2}
                      onChangeText={setBowlingHand}
                    />
                  </View>
                </>
              ) : null}
              <TextInput
                style={styles.modalTextArea}
                placeholder="Ask a question about your training…"
                value={askQuestion}
                onChangeText={setAskQuestion}
                multiline
              />

              {askAnswer ? (
                <View style={styles.modalScrollBox}>
                  <Text style={styles.modalBodyText}>{askAnswer}</Text>
                </View>
              ) : null}

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={closeAskAI}
                >
                  <Text style={styles.modalBtnSecondaryText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.modalBtnPrimary,
                    askLoading ? { opacity: 0.6 } : null,
                  ]}
                  onPress={submitAskAI}
                  disabled={askLoading}
                >
                  <Text style={styles.modalBtnPrimaryText}>
                    {askLoading ? 'Asking…' : 'Ask AI'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.aiCoachFab} onPress={openAskAI} activeOpacity={0.9}>
          <View style={styles.aiCoachBubble}>
            <Text style={styles.aiCoachIcon}>🤖</Text>
          </View>
          <View style={styles.aiCoachLabel}>
            <Text style={styles.aiCoachLabelText}>Topline AI Coach</Text>
          </View>
        </TouchableOpacity>

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
      </View>
    </SafeAreaView>
  );
};

export default PlayerVideosScreen;
