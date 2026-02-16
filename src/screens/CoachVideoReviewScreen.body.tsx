// src/screens/CoachVideoReviewScreen.body.tsx
// ✅ Changes:
// 1) Add coach consent checkbox for coach uploads (same pattern as player)
// 2) Block upload until consent accepted

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';

import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode, AVPlaybackStatus, VideoReadyForDisplayEvent } from 'expo-av';

import { useAuth } from '../context/AuthContext';
import { db, storage, serverTimestamp } from '../firebase';
import { styles } from '../styles/styles';
import { formatDayDate } from '../utils/dateFormatter';
import { fetchPlayersAndParents } from "../utils/publicUsers";
import { askAI } from '../services/askAI';
import VideoOverlayLayer from '../components/VideoOverlayLayer';
import { listenVideoOverlays, saveVideoOverlays } from '../services/videoOverlays';
import type { VideoOverlay, VideoOverlayType } from '../types';

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
type Tab = 'review' | 'share';

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

  const [tab, setTab] = useState<Tab>('review');

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

  // Ask AI (coach)
  const [askVisible, setAskVisible] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askVideoId, setAskVideoId] = useState('');

  // Markups (coach)
  const reviewVideoRef = useRef<Video>(null);
  const [annotateOn, setAnnotateOn] = useState(false);
  const [overlayType, setOverlayType] = useState<VideoOverlayType>('circle');
  const [overlayText, setOverlayText] = useState('Note');
  const [overlayColor, setOverlayColor] = useState('#bb2b2b');
  const [overlayThickness, setOverlayThickness] = useState(3);
  const [overlayItems, setOverlayItems] = useState<VideoOverlay[]>([]);
  const [overlayRedo, setOverlayRedo] = useState<VideoOverlay[]>([]);
  const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });
  const [overlayMs, setOverlayMs] = useState(0);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [autoSave, setAutoSave] = useState(false);
  const [savingOverlays, setSavingOverlays] = useState(false);
  const savingOverlaysRef = useRef(false);
  const [reviewVideoSize, setReviewVideoSize] = useState<{
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
  } | null>(null);

  const { width: windowWidth } = useWindowDimensions();

  const reviewStageWidth = useMemo(() => Math.max(0, windowWidth - 36), [windowWidth]);
  const reviewStageHeight = useMemo(() => {
    const aspect =
      reviewVideoSize && reviewVideoSize.width && reviewVideoSize.height
        ? reviewVideoSize.width / reviewVideoSize.height
        : 16 / 9;
    return Math.round(reviewStageWidth / aspect);
  }, [reviewStageWidth, reviewVideoSize]);
  const reviewStageStyle = useMemo(
    () => [
      styles.videoStage,
      {
        width: reviewStageWidth,
        height: reviewStageHeight,
        alignSelf: 'center',
      },
    ],
    [reviewStageWidth, reviewStageHeight]
  );
  const isDrawing = annotateOn && !!dragStart;

  const playerNameById = (playerId: string) =>
    players.find((p) => p.id === playerId)?.name ?? '';

  const textPresets = ['Footwork', 'Head still', 'Elbow high', 'Front shoulder', 'Follow through', 'Tempo'];
  const colorPresets = ['#bb2b2b', '#0f766e', '#1d4ed8', '#f59e0b', '#111827'];
  const thicknessPresets = [2, 3, 4, 5];

  const reviewOptions = useMemo(
    () => forReview.map((v) => ({ id: v.id, label: v.playerName || 'Player' })),
    [forReview]
  );

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
    setAnnotateOn(false);
    setOverlayType('circle');
    setDragStart(null);
    setDragCurrent(null);
    setOverlayRedo([]);
    setOverlayMs(0);
    setReviewVideoSize(null);
  };

  const closeReview = () => {
    setSelected(null);
    setDraftFeedback('');
    setAnnotateOn(false);
    setDragStart(null);
    setDragCurrent(null);
    setReviewVideoSize(null);
  };

  useEffect(() => {
    if (!selected?.id) {
      setOverlayItems([]);
      return;
    }
    const unsub = listenVideoOverlays(selected.id, (doc) => {
      setOverlayItems(doc?.overlays || []);
      setOverlayRedo([]);
    });
    return () => unsub();
  }, [selected?.id]);

  const onReviewStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setOverlayMs(status.positionMillis || 0);
  };

  const onReviewReadyForDisplay = (event: VideoReadyForDisplayEvent) => {
    const { width, height, orientation } = event.naturalSize || {};
    if (!width || !height) return;
    setReviewVideoSize((prev) => {
      if (prev && prev.width === width && prev.height === height) return prev;
      return { width, height, orientation };
    });
  };

  const pauseReviewVideo = () => {
    try {
      reviewVideoRef.current?.pauseAsync?.();
    } catch {}
  };

  const formatMs = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const jumpTo = async (ms: number) => {
    const next = Math.max(0, Math.round(ms));
    setOverlayMs(next);
    pauseReviewVideo();
    try {
      await reviewVideoRef.current?.setPositionAsync?.(next);
    } catch {}
  };

  const addOverlay = (ov: VideoOverlay) => {
    setOverlayItems((prev) => {
      const next = [...prev, ov];
      if (autoSave && !savingOverlaysRef.current) {
        persistOverlays(false, next);
      }
      return next;
    });
    setOverlayRedo([]);
    pauseReviewVideo();
  };

  const buildOverlayFromPoints = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): VideoOverlay | null => {
    if (!overlaySize.w || !overlaySize.h) return null;
    const tMs = Math.round(overlayMs || 0);
    const color = overlayColor;
    const thickness = overlayThickness;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distPx = Math.sqrt(
      Math.pow(dx * overlaySize.w, 2) + Math.pow(dy * overlaySize.h, 2)
    );
    const isTap = distPx < 6;

    if (overlayType === 'text') {
      return {
        tMs,
        type: 'text',
        x: start.x,
        y: start.y,
        w: 0,
        h: 0,
        text: overlayText.trim() || 'Note',
        color,
        thickness: Math.max(2, thickness),
      };
    }

    if (overlayType === 'line' || overlayType === 'arrow') {
      if (isTap) return null;
      return {
        tMs,
        type: overlayType,
        x: start.x,
        y: start.y,
        w: dx,
        h: dy,
        color,
        thickness,
      };
    }

    const minDim = Math.min(overlaySize.w, overlaySize.h);
    const radius = isTap ? 0.07 : Math.min(0.3, (distPx / minDim));
    const diameter = radius * 2;

    return {
      tMs,
      type: 'circle',
      x: start.x,
      y: start.y,
      w: diameter,
      h: diameter,
      color,
      thickness,
    };
  };

  const handleAnnotateStart = (e: any) => {
    if (!annotateOn || !overlaySize.w || !overlaySize.h) return;
    const { locationX, locationY } = e.nativeEvent;
    const x = locationX / overlaySize.w;
    const y = locationY / overlaySize.h;
    setDragStart({ x, y });
    setDragCurrent({ x, y });
    pauseReviewVideo();
  };

  const handleAnnotateMove = (e: any) => {
    if (!annotateOn || !dragStart || !overlaySize.w || !overlaySize.h) return;
    const { locationX, locationY } = e.nativeEvent;
    setDragCurrent({
      x: locationX / overlaySize.w,
      y: locationY / overlaySize.h,
    });
  };

  const handleAnnotateEnd = () => {
    if (!annotateOn || !dragStart) return;
    const end = dragCurrent || dragStart;
    const ov = buildOverlayFromPoints(dragStart, end);
    if (ov) {
      addOverlay(ov);
    }
    setDragStart(null);
    setDragCurrent(null);
  };

  const draftOverlay = useMemo(() => {
    if (!annotateOn || !dragStart) return null;
    const end = dragCurrent || dragStart;
    const ov = buildOverlayFromPoints(dragStart, end);
    return ov ? { ...ov, draft: true } : null;
  }, [
    annotateOn,
    dragStart,
    dragCurrent,
    overlayType,
    overlayText,
    overlayColor,
    overlayThickness,
    overlayMs,
    overlaySize.w,
    overlaySize.h,
  ]);

  const nudgeTime = (deltaMs: number) => {
    jumpTo((overlayMs || 0) + deltaMs);
  };

  const undoOverlay = () => {
    setOverlayItems((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setOverlayRedo((redo) => [...redo, last]);
      return prev.slice(0, -1);
    });
  };

  const redoOverlay = () => {
    setOverlayRedo((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setOverlayItems((items) => [...items, last]);
      return prev.slice(0, -1);
    });
  };

  const deleteLastOverlay = () => {
    setOverlayItems((prev) => prev.slice(0, -1));
    setOverlayRedo([]);
  };

  const centerLastOverlay = () => {
    setOverlayItems((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        { ...last, x: 0.5, y: 0.5 },
      ];
    });
  };

  const persistOverlays = async (notify: boolean, list?: VideoOverlay[]) => {
    if (!selected?.id || !coachUid || !selected.playerId) return;
    try {
      if (savingOverlaysRef.current) return;
      savingOverlaysRef.current = true;
      setSavingOverlays(true);
      await saveVideoOverlays({
        videoId: selected.id,
        coachId: coachUid,
        playerId: selected.playerId,
        createdAtMs: Date.now(),
        overlays: list ?? overlayItems,
      });
      if (notify) {
        Alert.alert('Saved', 'Markups saved.');
      }
    } catch (e: any) {
      console.log('Save overlays failed:', e);
      Alert.alert('Error', e?.message || 'Failed to save markups');
    } finally {
      savingOverlaysRef.current = false;
      setSavingOverlays(false);
    }
  };

  const sendMarkupsToPlayer = async () => {
    if (!selected?.id) return;
    await persistOverlays(false);
    try {
      await updateDoc(doc(db, 'videos', selected.id), {
        markupsShared: true,
        markupsSharedAtMs: Date.now(),
      });
      Alert.alert('Sent', 'Markups shared with the player.');
    } catch (e: any) {
      console.log('Send markups failed:', e);
      Alert.alert('Error', e?.message || 'Failed to send markups');
    }
  };

  const openAskAI = () => {
    if (forReview.length === 0) {
      Alert.alert('No videos', 'There are no player videos to review yet.');
      return;
    }
    const defaultId = selected?.id || forReview[0]?.id || '';
    setAskVideoId(defaultId);
    setAskQuestion('');
    setAskAnswer('');
    setAskVisible(true);
  };

  const closeAskAI = () => setAskVisible(false);

  const submitAskAI = async () => {
    if (askLoading) return;
    const q = askQuestion.trim();
    if (!q) {
      Alert.alert('Type a question', 'Please enter a question for the AI.');
      return;
    }
    if (!askVideoId) {
      Alert.alert('Select a player', 'Please select a player video to ask about.');
      return;
    }
    try {
      setAskLoading(true);
      const res = await askAI(q, { videoId: askVideoId });
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

  const SegToggle = ({
    leftLabel,
    rightLabel,
    leftActive,
    onLeft,
    onRight,
  }: {
    leftLabel: string;
    rightLabel: string;
    leftActive: boolean;
    onLeft: () => void;
    onRight: () => void;
  }) => {
    return (
      <View style={styles.coachFitnessSegWrap}>
        <TouchableOpacity
          onPress={onLeft}
          style={[styles.coachFitnessSegBtn, leftActive ? styles.coachFitnessSegBtnActive : null]}
        >
          <Text style={[styles.coachFitnessSegText, leftActive ? styles.coachFitnessSegTextActive : null]}>
            {leftLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRight}
          style={[styles.coachFitnessSegBtn, !leftActive ? styles.coachFitnessSegBtnActive : null]}
        >
          <Text style={[styles.coachFitnessSegText, !leftActive ? styles.coachFitnessSegTextActive : null]}>
            {rightLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={[styles.formScroll, { paddingBottom: 120 }]}>
       <View style={styles.coachPremiumHeaderCard}>
  <View style={styles.coachPremiumHeaderRow}>
    <View style={{ flex: 1, paddingRight: 10 }}>
      <Text style={styles.coachPremiumHeaderTitle}>Review Videos</Text>
      <Text style={styles.coachPremiumHeaderSub}>
        Review player uploads and share coaching clips.
      </Text>
    </View>

    <Image source={toplineLogo} style={styles.coachPremiumHeaderLogo} />
  </View>
</View>

        <SegToggle
          leftLabel="For Review"
          rightLabel="Upload for Player"
          leftActive={tab === 'review'}
          onLeft={() => setTab('review')}
          onRight={() => setTab('share')}
        />

        {tab === 'review' ? (
          <View style={styles.dashboardSectionWrap}>
            <View style={styles.dashboardSectionHeader}>
              <View style={styles.dashboardSectionHeaderLeft}>
                <View style={styles.dashboardSectionIconWrap}>
                  <Text style={styles.dashboardSectionIcon}>🎥</Text>
                </View>
                <Text style={styles.dashboardSectionTitle}>For Review</Text>
              </View>
            </View>
            <View style={styles.dashboardSectionDivider} />

            <Text style={styles.playerWelcomeSubText}>
              Videos submitted by players will appear here. Tap a card to review and save feedback.
            </Text>

            {loadingReview ? (
              <Text style={styles.playerWelcomeSubText}>Loading…</Text>
            ) : forReview.length === 0 ? (
              <Text style={styles.playerCardEmptyText}>No videos to review yet.</Text>
            ) : (
              <View style={{ marginTop: 10 }}>
                {forReview.map((v) => {
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
                })}
              </View>
            )}
          </View>
        ) : null}

        {tab === 'share' ? (
          <View style={styles.dashboardSectionWrap}>
            <View style={styles.dashboardSectionHeader}>
              <View style={styles.dashboardSectionHeaderLeft}>
                <View style={styles.dashboardSectionIconWrap}>
                  <Text style={styles.dashboardSectionIcon}>📤</Text>
                </View>
                <Text style={styles.dashboardSectionTitle}>Upload for Player</Text>
              </View>
            </View>
            <View style={styles.dashboardSectionDivider} />

            <Text style={styles.playerWelcomeSubText}>
              Upload a short coaching clip (max 2 mins) and share it with a registered player.
            </Text>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.coachAssignLabel}>Select player</Text>
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

              <Text style={[styles.coachAssignLabel, { marginTop: 10 }]}>Notes (optional)</Text>
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
          </View>
        ) : null}

        {/* Ask AI Modal */}
        <Modal visible={askVisible} transparent animationType="fade" onRequestClose={closeAskAI}>
            <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Ask AI</Text>
              <Text style={styles.modalHintText}>
                How to ask: goal + context + timeframe. Example: “Player struggles with front‑foot timing; drills for 2 weeks?”
              </Text>

              {reviewOptions.length > 0 ? (
                <>
                  <Text style={styles.modalHintText}>Select a player video for context.</Text>
                  <View style={styles.pickerCard}>
                    <Picker
                      selectedValue={askVideoId}
                      onValueChange={(value) => setAskVideoId(String(value))}
                    >
                      {reviewOptions.map((opt) => (
                        <Picker.Item key={opt.id} label={opt.label} value={opt.id} />
                      ))}
                    </Picker>
                  </View>
                </>
              ) : null}

              <TextInput
                style={styles.modalTextArea}
                placeholder="Ask a question about the player’s training…"
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
            <ScrollView contentContainerStyle={styles.formScroll} scrollEnabled={!isDrawing}>
              <View style={styles.coachReviewHeaderRow}>
                <Text style={styles.coachSectionTitle}>Review</Text>

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

                    <View
                      style={reviewStageStyle}
                      onLayout={(e) =>
                        setOverlaySize({
                          w: e.nativeEvent.layout.width,
                          h: e.nativeEvent.layout.height,
                        })
                      }
                    >
                      <Video
                        ref={reviewVideoRef}
                        source={{ uri: selected.videoUrl || '' }}
                        style={styles.videoStageVideo}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        onPlaybackStatusUpdate={onReviewStatus}
                        onReadyForDisplay={onReviewReadyForDisplay}
                        progressUpdateIntervalMillis={250}
                      />
                      <VideoOverlayLayer
                        overlays={overlayItems}
                        currentTimeMs={overlayMs}
                        width={overlaySize.w}
                        height={overlaySize.h}
                        draftOverlay={draftOverlay}
                      />
                      {annotateOn ? (
                        <View
                          style={styles.videoStageTouch}
                          onStartShouldSetResponder={() => true}
                          onMoveShouldSetResponder={() => true}
                          onStartShouldSetResponderCapture={() => true}
                          onMoveShouldSetResponderCapture={() => true}
                          onResponderTerminationRequest={() => false}
                          onResponderTerminate={handleAnnotateEnd}
                          onResponderGrant={handleAnnotateStart}
                          onResponderMove={handleAnnotateMove}
                          onResponderRelease={handleAnnotateEnd}
                        />
                      ) : null}
                    </View>

                    <View style={{ marginTop: 6 }}>
                      <TouchableOpacity
                        style={[styles.secondaryButton, { paddingVertical: 8 }]}
                        onPress={() =>
                          setAnnotateOn((v) => {
                            const next = !v;
                            if (next) {
                              pauseReviewVideo();
                            } else {
                              setDragStart(null);
                              setDragCurrent(null);
                            }
                            return next;
                          })
                        }
                      >
                        <Text style={styles.secondaryButtonText}>
                          {annotateOn ? '✓ Annotate On' : 'Annotate'}
                        </Text>
                      </TouchableOpacity>

                      {annotateOn ? (
                        <>
                          <View style={styles.overlayToolRow}>
                            {(['circle', 'arrow', 'line', 'text'] as VideoOverlayType[]).map((t) => (
                              <TouchableOpacity
                                key={t}
                                style={[
                                  styles.overlayToolPill,
                                  overlayType === t ? styles.overlayToolPillActive : null,
                                ]}
                                onPress={() => {
                                  setOverlayType(t);
                                  setDragStart(null);
                                  setDragCurrent(null);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.overlayToolText,
                                    overlayType === t ? styles.overlayToolTextActive : null,
                                  ]}
                                >
                                  {t}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <View style={styles.overlaySwatchRow}>
                            {colorPresets.map((c) => (
                              <TouchableOpacity
                                key={c}
                                onPress={() => setOverlayColor(c)}
                                style={[
                                  styles.overlaySwatch,
                                  { backgroundColor: c },
                                  overlayColor === c ? styles.overlaySwatchActive : null,
                                ]}
                              />
                            ))}
                            <View style={styles.overlaySwatchDivider} />
                            {thicknessPresets.map((t) => (
                              <TouchableOpacity
                                key={t}
                                onPress={() => setOverlayThickness(t)}
                                style={[
                                  styles.overlayThicknessPill,
                                  overlayThickness === t ? styles.overlayThicknessPillActive : null,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.overlayThicknessText,
                                    overlayThickness === t ? styles.overlayThicknessTextActive : null,
                                  ]}
                                >
                                  {t}px
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {overlayType === 'text' ? (
                            <>
                              <TextInput
                                style={[styles.statsInput, { height: 44, marginTop: 8 }]}
                                placeholder="Label text"
                                value={overlayText}
                                onChangeText={setOverlayText}
                              />
                              <View style={styles.overlayChipRow}>
                                {textPresets.map((p) => (
                                  <TouchableOpacity
                                    key={p}
                                    onPress={() => {
                                      setOverlayType('text');
                                      setOverlayText(p);
                                    }}
                                    style={[
                                      styles.overlayChip,
                                      overlayText === p ? styles.overlayChipActive : null,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.overlayChipText,
                                        overlayText === p ? styles.overlayChipTextActive : null,
                                      ]}
                                    >
                                      {p}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </>
                          ) : null}

                          <View style={styles.overlayActionRow}>
                            <TouchableOpacity style={styles.overlayActionPill} onPress={undoOverlay}>
                              <Text style={styles.overlayActionText}>Undo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overlayActionPill} onPress={redoOverlay}>
                              <Text style={styles.overlayActionText}>Redo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overlayActionPill} onPress={deleteLastOverlay}>
                              <Text style={styles.overlayActionText}>Delete last</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overlayActionPill} onPress={centerLastOverlay}>
                              <Text style={styles.overlayActionText}>Center last</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.overlayActionPill,
                                autoSave ? styles.overlayActionPillActive : null,
                              ]}
                              onPress={() => setAutoSave((v) => !v)}
                            >
                              <Text
                                style={[
                                  styles.overlayActionText,
                                  autoSave ? styles.overlayActionTextActive : null,
                                ]}
                              >
                                Auto-save {autoSave ? 'On' : 'Off'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.overlayTimeRow}>
                            <Text style={styles.overlayTimeText}>
                              Time {formatMs(overlayMs)}
                            </Text>
                            <View style={styles.overlayTimeBtns}>
                              <TouchableOpacity
                                style={styles.overlayTimeBtn}
                                onPress={() => nudgeTime(-100)}
                              >
                                <Text style={styles.overlayTimeBtnText}>-0.1s</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.overlayTimeBtn}
                                onPress={() => nudgeTime(100)}
                              >
                                <Text style={styles.overlayTimeBtnText}>+0.1s</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <Text style={styles.overlayHintText}>
                            Tap to place a marker. Drag to size circles or draw lines/arrows.
                          </Text>

                          {overlayItems.length > 0 ? (
                            <View style={styles.overlayList}>
                              {overlayItems
                                .slice()
                                .sort((a, b) => a.tMs - b.tMs)
                                .slice(-8)
                                .map((o, idx) => (
                                  <TouchableOpacity
                                    key={`${o.tMs}_${idx}`}
                                    style={styles.overlayListItem}
                                    onPress={() => jumpTo(o.tMs)}
                                  >
                                    <Text style={styles.overlayListTime}>{formatMs(o.tMs)}</Text>
                                    <Text style={styles.overlayListType}>{o.type}</Text>
                                    {o.text ? (
                                      <Text style={styles.overlayListNote} numberOfLines={1}>
                                        {o.text}
                                      </Text>
                                    ) : null}
                                  </TouchableOpacity>
                                ))}
                              {overlayItems.length > 8 ? (
                                <Text style={styles.overlayListMore}>
                                  +{overlayItems.length - 8} more
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                        </>
                      ) : null}

                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity
                          style={[styles.primaryButton, { flex: 1, paddingVertical: 10 }]}
                          onPress={() => persistOverlays(true)}
                          disabled={savingOverlays}
                        >
                          <Text style={styles.primaryButtonText}>
                            {savingOverlays ? 'Saving…' : 'Save Markups'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.confirmButton, { flex: 1, paddingVertical: 10 }]}
                          onPress={sendMarkupsToPlayer}
                          disabled={savingOverlays}
                        >
                          <Text style={styles.confirmButtonText}>Send to Player</Text>
                        </TouchableOpacity>
                      </View>
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
