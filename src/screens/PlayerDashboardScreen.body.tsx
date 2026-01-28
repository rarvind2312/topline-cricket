// src/screens/PlayerDashboardScreen.body.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { collection, getDocs, limit, query, where, onSnapshot } from 'firebase/firestore';

import { styles } from '../styles/styles';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList, PlayerKeyStats } from '../types';
import { updatePlayerKeyStats } from '../services/userProfile';

// If you already have an assets helper, swap this to your existing import.
const TOPLINE_LOGO = require('../../assets/topline-cricket-image.jpg');

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerDashboard'>;

type UpcomingSession = {
  id: string;
  skill?: string;
  coachName?: string;
  startAt?: any; // keep flexible (Firestore Timestamp / string / number)
  status?: string;
};

type RecentFeedback = {
  id: string;
  coachName?: string;
  feedback?: string;
  skill?: string;
  createdAtLabel?: string;
};

function safeToDate(input: any): Date | null {
  if (!input) return null;

  // ✅ FIX: already a Date
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  // Firestore Timestamp
  if (typeof input === 'object' && typeof input.toDate === 'function') {
    try {
      return input.toDate();
    } catch {
      return null;
    }
  }

  // number (ms)
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // ISO string
  if (typeof input === 'string') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function formatDateTime(d: Date): string {
  const day = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

export default function PlayerDashboardScreenBody({ navigation }: Props) {
  const { firebaseUser, profile } = useAuth();
  const uid = firebaseUser?.uid ?? '';

  const initials = useMemo(() => {
    const fn = profile?.firstName?.trim()?.[0] ?? '';
    const ln = profile?.lastName?.trim()?.[0] ?? '';
    return (fn + ln).toUpperCase() || 'P';
  }, [profile?.firstName, profile?.lastName]);

  const fullName = useMemo(() => {
    return `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'Player';
  }, [profile?.firstName, profile?.lastName]);

  const playerRoleLabel = useMemo(() => {
    return (profile as any)?.playerType?.trim() || 'All Rounder';
  }, [profile]);

  // -----------------------------
  // Upcoming session + recent feedback (Firestore)
  // -----------------------------
  const [upcoming, setUpcoming] = useState<UpcomingSession | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedback | null>(null);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (!uid) return;

    // Keep this helper (used elsewhere in your file)
    const getSessionsSnap = async (playerField: 'playerId' | 'playerID', lim: number) => {
      const sessionsRef = collection(db, 'sessions');
      // ✅ NO orderBy here (avoids composite index requirement)
      return getDocs(query(sessionsRef, where(playerField, '==', uid), limit(lim)));
    };

    const getSessionsForUser = async (lim = 200) => {
      // Some existing docs used `playerID` (capital D). You said you removed it now,
      // but keeping this fallback is harmless and helps older data.
      let snap = await getSessionsSnap('playerId', lim);
      if (snap.empty) snap = await getSessionsSnap('playerID', lim);
      return snap;
    };

    // ✅ REALTIME (no orderBy / no startAt where) — safe without composite indexes
    const loadUpcomingRealtime = () => {
      setLoadingUpcoming(true);

      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, where('playerId', '==', uid), limit(300));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const allDocs = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));

          const nowMs = Date.now();

          const next = allDocs
            .filter((d) => String(d.status ?? '').trim().toLowerCase() === 'scheduled')
            .filter((d) => {
              const dt = safeToDate(d.startAt);
              return !!dt && dt.getTime() >= nowMs;
            })
            .sort((a, b) => {
              const ad = safeToDate(a.startAt)?.getTime() ?? 0;
              const bd = safeToDate(b.startAt)?.getTime() ?? 0;
              return ad - bd;
            })[0];

          setUpcoming(
            next
              ? {
                  id: next.id,
                  startAt: next.startAt,
                  coachName: next.coachName,
                  skill: next.skill,
                  status: next.status,
                }
              : null
          );

          setLoadingUpcoming(false);
        },
        (e) => {
          console.warn('loadUpcoming realtime failed', e);
          setUpcoming(null);
          setLoadingUpcoming(false);
        }
      );

      return unsub;
    };

    // ✅ Recent feedback: also derived from sessions, realtime, no composite indexes
    const loadRecentFeedbackRealtime = () => {
      setLoadingFeedback(true);

      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, where('playerId', '==', uid), limit(300));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const allDocs = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));

          const withFeedback = allDocs
            .filter((d) => typeof d.feedback === 'string' && d.feedback.trim().length > 0)
            .sort((a, b) => {
              const ad =
                safeToDate(a.reviewedAt)?.getTime() ??
                safeToDate(a.updatedAt)?.getTime() ??
                safeToDate(a.startAt)?.getTime() ??
                0;
              const bd =
                safeToDate(b.reviewedAt)?.getTime() ??
                safeToDate(b.updatedAt)?.getTime() ??
                safeToDate(b.startAt)?.getTime() ??
                0;
              return bd - ad; // latest first
            });

          const latestWithFeedback = withFeedback[0];

          const reviewedAtDate = latestWithFeedback
            ? safeToDate((latestWithFeedback as any).reviewedAt) ||
              safeToDate((latestWithFeedback as any).updatedAt) ||
              safeToDate((latestWithFeedback as any).startAt)
            : null;

          setRecentFeedback(
            latestWithFeedback
              ? {
                  id: latestWithFeedback.id,
                  feedback: (latestWithFeedback as any).feedback,
                  coachName: (latestWithFeedback as any).coachName,
                  skill: (latestWithFeedback as any).skill,
                  createdAtLabel: reviewedAtDate ? formatDateTime(reviewedAtDate) : undefined,
                }
              : null
          );

          setLoadingFeedback(false);
        },
        (e) => {
          console.warn('loadRecentFeedback realtime failed', e);
          setRecentFeedback(null);
          setLoadingFeedback(false);
        }
      );

      return unsub;
    };

    const unsubUpcoming = loadUpcomingRealtime();
    const unsubFeedback = loadRecentFeedbackRealtime();

    // cleanup listeners
    return () => {
      try {
        unsubUpcoming?.();
      } catch {}
      try {
        unsubFeedback?.();
      } catch {}
    };
  }, [uid]);

  const formatDateTime = (value: any) => {
    const d = safeToDate(value);
    if (!d) return '—';
    return d.toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // -----------------------------
  // Stats (manual entry; saved to Firestore)
  // -----------------------------
  const [keyStats, setKeyStats] = useState<PlayerKeyStats | null>(
    ((profile as any)?.keyStats as PlayerKeyStats) ?? null
  );

  const [statsModalVisible, setStatsModalVisible] = useState(false);

  const [matches, setMatches] = useState('');
  const [innings, setInnings] = useState('');
  const [runs, setRuns] = useState('');
  const [highestScore, setHighestScore] = useState('');
  const [wickets, setWickets] = useState('');
  const [bestBowling, setBestBowling] = useState('');

  useEffect(() => {
    const ks = ((profile as any)?.keyStats as PlayerKeyStats) ?? null;
    setKeyStats(ks);

    if (ks) {
      setMatches(String(ks.matches ?? ''));
      setInnings(String(ks.innings ?? ''));
      setRuns(String(ks.runs ?? ''));
      setHighestScore(String(ks.highestScore ?? ''));
      setWickets(String(ks.wickets ?? ''));
      setBestBowling(String(ks.bestBowling ?? ''));
    } else {
      setMatches('');
      setInnings('');
      setRuns('');
      setHighestScore('');
      setWickets('');
      setBestBowling('');
    }
  }, [profile]);

  const openStatsEditor = () => {
    if ((profile as any)?.role && (profile as any)?.role !== 'player') return;
    setStatsModalVisible(true);
  };

  const saveStats = async () => {
    if (!uid) return;

    const m = Number(matches);
    const i = Number(innings);
    const r = Number(runs);
    const hs = Number(highestScore);
    const w = Number(wickets);

    if ([m, i, r, hs, w].some((n) => Number.isNaN(n) || n < 0)) {
      Alert.alert('Invalid stats', 'Please enter valid numbers for all fields.');
      return;
    }
    if (!bestBowling.trim()) {
      Alert.alert('Invalid stats', 'Please enter Best Bowling (e.g. 3/7).');
      return;
    }

    const payload: PlayerKeyStats = {
      matches: m,
      innings: i,
      runs: r,
      highestScore: hs,
      wickets: w,
      bestBowling: bestBowling.trim(),
    };

    try {
      await updatePlayerKeyStats(uid, payload);
      setKeyStats(payload);
      setStatsModalVisible(false);
    } catch (e: any) {
      Alert.alert('Failed to save stats', e?.message ?? 'Please try again.');
    }
  };

  const upcomingTimeLabel = useMemo(() => {
    const d = upcoming ? safeToDate(upcoming.startAt) : null;
    return d ? formatDateTime(d) : '';
  }, [upcoming]);

  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 260],
  });

  

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.headerTextBlock}>
              <Text style={styles.headerHi}>Hi,</Text>
              <Text style={styles.headerName} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.headerRole} numberOfLines={1}>
                {playerRoleLabel}
              </Text>
              <Text style={styles.headerWelcome}>
                Welcome to Topline Cricket — your journey to the next level starts here.
              </Text>
            </View>

            <Image source={TOPLINE_LOGO} style={styles.headerLogo} />
          </View>
        </View>

        {/* Upcoming Session */}
   
<>
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionTitle}>Upcoming Session</Text>
  </View>

  {/* ✅ No outer white card */}
  <View style={styles.sectionBlock}>
    {loadingUpcoming ? (
      <View style={styles.toplineSectionCard}>
        <View style={styles.shimmerBox}>
          <Animated.View
            style={[
              styles.shimmerOverlay,
              { transform: [{ translateX: shimmerTranslateX }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
        <View style={{ height: 12 }} />
        <View style={[styles.shimmerBox, { height: 18, width: '55%' }]} />
      </View>
    ) : upcoming ? (
      <View style={styles.toplineSectionCard}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={styles.bigTitle}>{upcoming.skill || 'Session'}</Text>

          <View style={[styles.pill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.pillText}>
              {(String(upcoming.status || 'Scheduled')).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.pillText}>
              👤 {String(upcoming.coachName || '—')}
            </Text>
          </View>

          <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.pillText}>
              🗓 {formatDateTime(upcoming.startAt) || '—'}
            </Text>
          </View>
        </View>
      </View>
    ) : (
      <View style={styles.toplineSectionCard}>
        <Text style={styles.emptyBody}>
          No Upcoming Sessions yet.
        </Text>
      </View>
    )}
  </View>
</>


        {/* Recent Reviews */}
        <>
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionTitle}>Recent Feedback</Text>
  </View>

  {/* ✅ Remove the outer white card look */}
  <View style={styles.sectionBlock}>
    {loadingFeedback ? (
      <View style={styles.toplineSectionCard}>
        <View style={styles.shimmerBox}>
          <Animated.View
            style={[
              styles.shimmerOverlay,
              { transform: [{ translateX: shimmerTranslateX }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
        <View style={{ height: 12 }} />
        <View style={[styles.shimmerBox, { height: 18, width: '70%' }]} />
      </View>
    ) : recentFeedback ? (
      <View style={styles.toplineSectionCard}>
        {/* ✅ Date + Skill (bold + visible) */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.pillText}>
              🗓 {String(recentFeedback.createdAtLabel || '—')}
            </Text>
          </View>

          {/* ✅ Center align Batting */}
          <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.pillText}>
              🏏 {String(recentFeedback.skill || 'Coach notes')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.titleRow}>
          <Text style={styles.bigTitle}>{recentFeedback.coachName || 'Coach'}</Text>
        </View>

        <Text style={styles.feedbackText}>{recentFeedback.feedback || '—'}</Text>
      </View>
    ) : (
      <View style={styles.toplineSectionCard}>
        <Text style={styles.emptyTitle}>No feedback yet</Text>
        <Text style={styles.emptyBody}>
          Your coach’s notes will appear here once a session is reviewed.
        </Text>
      </View>
    )}
  </View>
</>


        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsCard}>
          <TouchableOpacity
            style={styles.quickActionTile}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PlayerVideos')}
          >
            <Text style={styles.quickActionEmoji}>🎥</Text>
            <Text style={styles.quickActionText}>Upload Video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionTile}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PlayerFitness')}
          >
            <Text style={styles.quickActionEmoji}>❤️‍🔥</Text>
            <Text style={styles.quickActionText}>Fitness</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.card}>
          <View style={styles.statsHeaderRow}>
            <Text style={styles.statsCardTitle}>Season Stats</Text>

            {!!keyStats && (
              <TouchableOpacity onPress={openStatsEditor} activeOpacity={0.8}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.statsCardSubtitle}>
            Add your key batting/bowling stats from your PlayCricket summary page.
          </Text>

          {keyStats ? (
            <View style={styles.statsTable}>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Matches</Text>
                <Text style={styles.statsValue}>{keyStats.matches}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Innings</Text>
                <Text style={styles.statsValue}>{keyStats.innings}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Runs</Text>
                <Text style={styles.statsValue}>{keyStats.runs}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Highest</Text>
                <Text style={styles.statsValue}>{keyStats.highestScore}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Wickets</Text>
                <Text style={styles.statsValue}>{keyStats.wickets}</Text>
              </View>
              <View style={[styles.statsRow, styles.statsRowLast]}>
                <Text style={styles.statsLabel}>Best Bowling</Text>
                <Text style={styles.statsValue}>{keyStats.bestBowling}</Text>
              </View>
            </View>
          ) : null}

          {!keyStats && (
            <TouchableOpacity
              style={styles.statsButton}
              activeOpacity={0.9}
              onPress={openStatsEditor}
            >
              <Text style={styles.statsButtonText}>Add key stats manually</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Modal */}
        <Modal visible={statsModalVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Key Stats</Text>

              <View style={styles.modalRow}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Matches</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={matches}
                    onChangeText={setMatches}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Innings</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={innings}
                    onChangeText={setInnings}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Runs</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={runs}
                    onChangeText={setRuns}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Highest</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={highestScore}
                    onChangeText={setHighestScore}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Wickets</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={wickets}
                    onChangeText={setWickets}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Best Bowling</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={bestBowling}
                    onChangeText={setBestBowling}
                    placeholder="e.g. 3/7"
                  />
                </View>
              </View>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={() => setStatsModalVisible(false)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={saveStats}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalBtnPrimaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
