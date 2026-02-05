// src/screens/CoachVideoReviewScreen.body.tsx
// ✅ Changes:
// 1) Add coach consent checkbox for coach uploads (same pattern as player)
// 2) Block upload until consent accepted

import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';

import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';

import { useAuth } from '../context/AuthContext';
import { db, storage, serverTimestamp } from '../firebase';
import { styles } from '../styles/styles';
import { formatDayDate } from '../utils/dateFormatter';
import { fetchPlayersAndParents } from "../utils/publicUsers";

import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
  addDoc
} from 'firebase/firestore';

import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';

const toplineLogo = require('../../assets/topline-cricket-image.jpg');
const MAX_VIDEO_SECONDS = 120;

// RN-friendly uri -> blob (reliable for iOS file://)
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

type VideoDoc = {
  id: string;
  playerId?: string;
  playerName?: string;
  coachId?: string;
  coachName?: string;
  uploadedBy?: 'player' | 'coach';
  videoUrl?: string;
  storagePath?: string;

  status?: string; // submitted | reviewed | shared
  reviewed?: boolean;

  feedback?: string;
  notes?: string;

  createdAtLabel?: string;
  createdAtRaw?: any;
};

type PlayerLite = { id: string; name: string };

const CoachVideoReviewScreenBody: React.FC<any> = ({ navigation }: any) => {
  const { firebaseUser, profile } = useAuth();

  const coachUid = firebaseUser?.uid || '';

  const coachName = useMemo(() => {
    const fn = (profile as any)?.firstName || '';
    const ln = (profile as any)?.lastName || '';
    const full = `${fn} ${ln}`.trim();
    return full || (profile as any)?.email || 'Coach';
  }, [profile]);

  // 1) FOR REVIEW: player -> coach
  const [forReview, setForReview] = useState<VideoDoc[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);

  const [selected, setSelected] = useState<VideoDoc | null>(null);
  const [draftFeedback, setDraftFeedback] = useState('');

  // 2) SHARE: coach -> player
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [pickedVideoUri, setPickedVideoUri] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // ✅ NEW: coach consent checkbox (reuse pattern)
  const [coachAcceptedPolicy, setCoachAcceptedPolicy] = useState(false);

  const playerNameById = (playerId: string) =>
    players.find((p) => p.id === playerId)?.name ?? '';

  // Listen: videos assigned to this coach (player uploads)
  useEffect(() => {
    if (!coachUid) return;

    setLoadingReview(true);

    const q1 = query(
      collection(db, 'videos'),
      where('coachId', '==', coachUid),
      limit(50)
    );

    const unsub = onSnapshot(
      q1,
      (snap) => {
        const list: VideoDoc[] = snap.docs
          .map((d) => {
            const data: any = d.data();

            const createdAtLabel =
              data?.createdAt?.toDate?.()
                ? formatDayDate(data.createdAt.toDate())
                : '';

            return {
              id: d.id,
              playerId: data.playerId,
              playerName: data.playerName || 'Player',
              coachId: data.coachId,
              coachName: data.coachName,
              uploadedBy: data.uploadedBy,
              videoUrl: data.videoUrl,
              storagePath: data.storagePath,
              status: data.status,
              reviewed: data.reviewed,
              feedback: data.feedback,
              notes: data.notes,
              createdAtLabel,
              createdAtRaw: data.createdAt,
            };
          })
          // ✅ STRICT player-only (missing uploadedBy treated as player)
          .filter((v) => String(v.uploadedBy || 'player').toLowerCase() === 'player');

        list.sort((a, b) => {
          const ta = a.createdAtRaw?.toDate?.()?.getTime?.() ?? 0;
          const tb = b.createdAtRaw?.toDate?.()?.getTime?.() ?? 0;
          return tb - ta;
        });

        setForReview(list);
        setLoadingReview(false);
      },
      (err) => {
        console.log('Coach review listener error:', err);
        setLoadingReview(false);
      }
    );

    return () => unsub();
  }, [coachUid]);

  const openReview = (v: VideoDoc) => {
    setSelected(v);
    setDraftFeedback(v.feedback || '');
  };

  const closeReview = () => {
    setSelected(null);
    setDraftFeedback('');
  };

  const saveFeedback = async () => {
    if (!selected?.id) return;

    try {
      const refDoc = doc(db, 'videos', selected.id);

      await updateDoc(refDoc, {
        feedback: (draftFeedback || '').trim(),
        reviewed: true,
        status: 'reviewed',
        reviewedAt: serverTimestamp(),
      });

      Alert.alert('Saved', 'Feedback saved for the player.');
      closeReview();
    } catch (e: any) {
      console.log('Save feedback failed:', e);
      Alert.alert('Error', e?.message || 'Failed to save feedback');
    }
  };

  // Load registered players (players + parents) from publicUsers
useEffect(() => {
  const loadPlayers = async () => {
    try {
      setLoadingPlayers(true);

      const list = await fetchPlayersAndParents(200);

      // CoachVideoReviewScreen expects: { id, name }
      const mapped: PlayerLite[] = list.map((u) => ({
        id: u.id,
        name: u.name,
      }));

      setPlayers(mapped);
    } catch (e) {
      console.log("Load players error:", e);
    } finally {
      setLoadingPlayers(false);
    }
  };

  loadPlayers();
}, []);



  const pickCoachVideo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow access to your media library.');
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
        Alert.alert('Video too long', 'Please select a video up to 2 minutes.');
        return;
      }

      setPickedVideoUri(asset.uri);
    } catch (e: any) {
      console.log('Pick coach video failed:', e);
      Alert.alert('Error', e?.message || 'Failed to pick video');
    }
  };

  const shareToPlayer = async () => {
    if (!firebaseUser?.uid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!selectedPlayerId) {
      Alert.alert('Select player', 'Please select a registered player.');
      return;
    }
    if (!pickedVideoUri) {
      Alert.alert('No video', 'Please pick a video to share.');
      return;
    }

    // ✅ NEW: consent required
    if (!coachAcceptedPolicy) {
      Alert.alert(
        'Confirmation required',
        'Please accept responsibility before sharing this video with the player.'
      );
      return;
    }

    try {
      setUploading(true);

      const blob = await uriToBlob(pickedVideoUri);

      const fileName = `coach_vid_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
      const storagePath = `coachVideos/${firebaseUser.uid}/${fileName}`;
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

      const playerName = playerNameById(selectedPlayerId);

      await addDoc(collection(db, 'videos'), {
        uploadedBy: 'coach',
        coachId: firebaseUser.uid,
        coachName,

        playerId: selectedPlayerId,
        playerName: playerName || '',

        videoUrl: downloadUrl,
        storagePath,

        notes: (notes || '').trim(),
        status: 'shared',
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });

      Alert.alert('Shared', 'Video shared with the selected player.');

      setPickedVideoUri('');
      setNotes('');
      setSelectedPlayerId('');

      // ✅ reset consent for next upload
      setCoachAcceptedPolicy(false);
    } catch (e: any) {
      console.log('Coach upload failed:', e);
      Alert.alert(
        'Upload failed',
        e?.message || e?.code || 'Firebase Storage: An unknown error occurred. (storage/unknown)'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <View style={styles.coachTopHeaderRow}>
          <Text style={styles.sectionTitle}>Coach Videos</Text>
          <Image source={toplineLogo} style={styles.coachTopRightLogoSmall} resizeMode="contain" />
        </View>

        {/* 1) FOR REVIEW */}
        <Text style={styles.playerCardSubtitle}>For Review</Text>
        <Text style={styles.playerWelcomeSubText}>
          Videos submitted by players will appear here. Tap a card to review and save feedback.
        </Text>

        {loadingReview ? (
          <Text style={styles.playerWelcomeSubText}>Loading…</Text>
        ) : forReview.length === 0 ? (
          <Text style={styles.playerCardEmptyText}>No videos to review yet.</Text>
        ) : (
          forReview.map((v) => {
            const isDone = !!v.reviewed || v.status === 'reviewed';
            return (
              <TouchableOpacity
                key={v.id}
                style={styles.coachVideoCard}
                onPress={() => openReview(v)}
              >
                <View style={styles.videoCardRow}>
                  <View>
                    <Text style={styles.videoCardName}>{v.playerName || 'Player'}</Text>
                    <Text style={styles.videoCardMeta}>
                      {v.createdAtLabel || '—'} • {isDone ? 'Reviewed' : 'Pending'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.coachStatusPill,
                      isDone ? styles.coachStatusPillDone : styles.coachStatusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.coachStatusText,
                        isDone ? styles.coachStatusTextDone : styles.coachStatusTextPending,
                      ]}
                    >
                      {isDone ? 'Reviewed' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.coachVideoCTA}>Tap to {isDone ? 'view' : 'review'} →</Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* 2) SHARE TO PLAYER */}
        <View style={{ marginTop: 18 }}>
          <Text style={styles.cardSubtitle}>Share Video to Player</Text>
          <Text style={styles.playerWelcomeSubText}>
            Upload a short coaching clip (max 2 mins) and share it with a registered player.
          </Text>

          <Text style={styles.assignLabel}>Select player</Text>
          <View style={styles.pickerCard}>
            <Picker
              enabled={!loadingPlayers && !uploading}
              selectedValue={selectedPlayerId}
              onValueChange={(value) => setSelectedPlayerId(String(value))}
            >
              <Picker.Item label={loadingPlayers ? 'Loading players…' : 'Select a player...'} value="" />
              {players.map((p) => (
                <Picker.Item key={p.id} label={p.name} value={p.id} />
              ))}
            </Picker>
          </View>

          <Text style={[styles.assignLabel, { marginTop: 10 }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.statsInput, { height: 90, textAlignVertical: 'top' }]}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="What should the player focus on?"
            editable={!uploading}
          />

          {/* ✅ NEW: consent checkbox */}
          <TouchableOpacity
            onPress={() => setCoachAcceptedPolicy((p) => !p)}
            style={{ marginTop: 10 }}
            disabled={uploading}
          >
            <Text style={styles.playerWelcomeSubText}>
              {coachAcceptedPolicy ? '☑ ' : '☐ '}
              I confirm this is an appropriate coaching video for the player. I take responsibility for the
              content. Inappropriate uploads may lead to my account being removed.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 12 }]}
            onPress={pickCoachVideo}
            disabled={uploading}
          >
            <Text style={styles.secondaryButtonText}>
              {pickedVideoUri ? 'Change Video' : '+ Pick Video (max 2 mins)'}
            </Text>
          </TouchableOpacity>

          {!!pickedVideoUri && (
            <View style={{ marginTop: 12 }}>
              <Video
                source={{ uri: pickedVideoUri }}
                style={styles.videoPlayer}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedPlayerId || !pickedVideoUri || !coachAcceptedPolicy ? { opacity: 0.5 } : null,
              { marginTop: 12 },
            ]}
            disabled={!selectedPlayerId || !pickedVideoUri || !coachAcceptedPolicy || uploading}
            onPress={shareToPlayer}
          >
            <Text style={styles.confirmButtonText}>
              {uploading ? 'Uploading…' : 'Send to Player'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Return */}
        <View style={{ marginTop: 18, marginBottom: 30 }}>
          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 10 }]}
            onPress={() => navigation.goBack()}
            disabled={uploading}
          >
            <Text style={styles.secondaryButtonText}>⬅ Return to Coach Dashboard</Text>
          </TouchableOpacity>
        </View>

        {/* Review Modal */}
        <Modal visible={!!selected} animationType="slide" onRequestClose={closeReview}>
          <SafeAreaView style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.formScroll}>
              <View style={styles.coachReviewHeaderRow}>
                <Text style={styles.sectionTitle}>Review</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image source={toplineLogo} style={styles.coachTopRightLogoSmall} resizeMode="contain" />
                  <TouchableOpacity onPress={closeReview} style={{ marginLeft: 10 }}>
                    <Text style={styles.coachCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {selected ? (
                <>
                  <View style={styles.coachCard}>
                    <Text style={styles.playerCardTitle}>{selected.playerName || 'Player'}</Text>
                    <Text style={styles.playerCardSubtitle}>
                      {selected.createdAtLabel || '—'} •{' '}
                      {selected.reviewed || selected.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                    </Text>

                    <View style={{ marginTop: 12 }}>
                      <Video
                        source={{ uri: selected.videoUrl || '' }}
                        style={styles.videoPlayer}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                      />
                    </View>
                  </View>

                  <View style={styles.coachCard}>
                    <Text style={styles.statsLabel}>Coach feedback</Text>
                    <TextInput
                      style={[styles.statsInput, { height: 110, textAlignVertical: 'top' }]}
                      multiline
                      placeholder="Write feedback for the player…"
                      value={draftFeedback}
                      onChangeText={setDraftFeedback}
                    />

                    <TouchableOpacity style={[styles.primaryButton, { marginTop: 12 }]} onPress={saveFeedback}>
                      <Text style={styles.primaryButtonText}>Save Feedback</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CoachVideoReviewScreenBody;