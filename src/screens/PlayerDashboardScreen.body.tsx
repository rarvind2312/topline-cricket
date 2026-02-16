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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { collection, limit, query, where, onSnapshot } from 'firebase/firestore';

import { styles } from '../styles/styles';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList, PlayerKeyStats } from '../types';
import { updatePlayerKeyStats, updateUserProfile } from '../services/userProfile';

// ✅ shared date utils
import {
  safeToDate,
  formatDayDate,
  formatDayDateTime,
  formatDayDateFromYYYYMMDD,
} from '../utils/dateFormatter';

const TOPLINE_LOGO = require('../../assets/topline-cricket-image.jpg');

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerDashboard'>;

type UpcomingItem = {
  id: string;
  kind: 'coaching' | 'training';
  skill?: string;
  coachName?: string;
  laneName?: string;
  date?: string; // YYYY-MM-DD
  start?: string; // HH:mm
  end?: string; // HH:mm
  status?: string; // upcoming/scheduled
};

type RecentFeedback = {
  id: string;
  coachName?: string;
  feedback?: string;
  skill?: string;
  createdAtLabel?: string;
};

// ✅ local-safe: combine YYYY-MM-DD + HH:mm into a Date used ONLY for sorting/selection
function parseSessionStartLocal(dateStr?: string, startHHMM?: string): Date | null {
  if (!dateStr || !startHHMM) return null;
  const [y, mo, da] = dateStr.split('-').map(Number);
  const [h, mi] = startHHMM.split(':').map(Number);
  if (!y || !mo || !da || Number.isNaN(h) || Number.isNaN(mi)) return null;
  const d = new Date(y, mo - 1, da, h, mi, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);

  // -----------------------------
  // Upcoming session + recent feedback (Firestore)
  // -----------------------------
  const [upcomingSession, setUpcomingSession] = useState<UpcomingItem | null>(null);
  const [upcomingLane, setUpcomingLane] = useState<UpcomingItem | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedback | null>(null);
  const [loadingUpcomingSession, setLoadingUpcomingSession] = useState(false);
  const [loadingUpcomingLane, setLoadingUpcomingLane] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const loadingUpcoming = loadingUpcomingSession || loadingUpcomingLane;
  const upcoming = useMemo(() => {
    if (!upcomingSession && !upcomingLane) return null;
    if (!upcomingSession) return upcomingLane;
    if (!upcomingLane) return upcomingSession;

    const sDt = parseSessionStartLocal(upcomingSession.date, upcomingSession.start);
    const lDt = parseSessionStartLocal(upcomingLane.date, upcomingLane.start);
    const sMs = sDt?.getTime?.() ?? Number.POSITIVE_INFINITY;
    const lMs = lDt?.getTime?.() ?? Number.POSITIVE_INFINITY;

    if (sMs === lMs) return upcomingSession;
    return lMs < sMs ? upcomingLane : upcomingSession;
  }, [upcomingSession, upcomingLane]);

  useEffect(() => {
    if (!uid) return;

    // ✅ Upcoming Session — from sessions (date/start/end/status)
    const loadUpcomingFromSessions = () => {
      setLoadingUpcomingSession(true);

      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, where('playerId', '==', uid), limit(300));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          const nowMs = Date.now();

          const candidate = docs
            .filter((s) => {
              const st = String(s.status || '').trim().toLowerCase();
              return (st === 'upcoming' || st === 'scheduled') && s.date === todayKey;
            })
            .map((s) => {
              const startDt = parseSessionStartLocal(s.date, s.start);
              return { ...s, _startDt: startDt };
            })
            .filter((s) => !!s._startDt && s._startDt.getTime() >= nowMs)
            .sort((a, b) => a._startDt.getTime() - b._startDt.getTime())[0];

          setUpcomingSession(
            candidate
              ? {
                  id: candidate.id,
                  kind: 'coaching',
                  coachName: candidate.coachName,
                  skill: candidate.skill,
                  date: candidate.date,
                  start: candidate.start,
                  end: candidate.end,
                  status: candidate.status,
                }
              : null
          );

          setLoadingUpcomingSession(false);
        },
        (e) => {
          console.warn('Upcoming sessions listener failed', e);
          setUpcomingSession(null);
          setLoadingUpcomingSession(false);
        }
      );

      return unsub;
    };

    const loadUpcomingFromLaneBookings = () => {
      setLoadingUpcomingLane(true);

      const bookingsRef = collection(db, 'laneBookings');
      const q = query(bookingsRef, where('playerId', '==', uid), limit(300));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          const nowMs = Date.now();

          const candidate = docs
            .filter(
              (b) => String(b.status || '').toLowerCase() !== 'cancelled' && b.date === todayKey
            )
            .map((b) => {
              const startDt = parseSessionStartLocal(b.date, b.start);
              return { ...b, _startDt: startDt };
            })
            .filter((b) => !!b._startDt && b._startDt.getTime() >= nowMs)
            .sort((a, b) => a._startDt.getTime() - b._startDt.getTime())[0];

          const kind =
            String(candidate?.bookingType || '').toLowerCase() === 'training'
              ? 'training'
              : 'coaching';

          setUpcomingLane(
            candidate
              ? {
                  id: candidate.id,
                  kind,
                  coachName: candidate.coachName,
                  laneName: candidate.laneName,
                  date: candidate.date,
                  start: candidate.start,
                  end: candidate.end,
                  status: candidate.status,
                }
              : null
          );

          setLoadingUpcomingLane(false);
        },
        (e) => {
          console.warn('Upcoming lane bookings listener failed', e);
          setUpcomingLane(null);
          setLoadingUpcomingLane(false);
        }
      );

      return unsub;
    };

    // ✅ Recent Feedback — latest of:
    // A) reviewed player video feedback (status=reviewed + feedback)
    // B) coach coaching video notes (uploadedBy=coach + notes)
    // C) coach-reviewed fitness (fitnessEntries.coachReviewedAtMs)
    const loadRecentFeedbackCombined = () => {
      setLoadingFeedback(true);

      const videosRef = collection(db, 'videos');
      const qV = query(videosRef, where('playerId', '==', uid), limit(300));

      const fitnessRef = collection(db, 'fitnessEntries');
      const qF = query(fitnessRef, where('playerId', '==', uid), limit(300));

      let latestVideo: any = null;
      let latestFitness: any = null;

      const compute = () => {
        const videoTs = latestVideo?.__ts ?? 0;
        const fitTs = latestFitness?.__ts ?? 0;

        const pick = videoTs >= fitTs ? latestVideo : latestFitness;

        setRecentFeedback(
          pick
            ? {
                id: pick.id,
                coachName: pick.coachName,
                skill: pick.skill || pick.kind || 'Practice',
                feedback: pick.feedback,
                createdAtLabel: pick.createdAtLabel,
              }
            : null
        );

        setLoadingFeedback(false);
      };

      const unsubV = onSnapshot(
        qV,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

          // A) reviewed video feedback
          const reviewed = docs
            .filter((v) => {
              const status = String(v.status || '').trim().toLowerCase();
              const hasFeedback = typeof v.feedback === 'string' && v.feedback.trim().length > 0;
              return status === 'reviewed' && hasFeedback;
            })
            .map((v) => {
              const dt = safeToDate(v.reviewedAt) || safeToDate(v.createdAt) || safeToDate(v.createdAtMs);
              return {
                id: v.id,
                coachName: v.coachName,
                skill: v.skill || 'Practice',
                feedback: v.feedback,
                createdAtLabel: dt ? formatDayDate(dt) : undefined,
                __ts: dt?.getTime?.() ?? 0,
              };
            });

          // B) coach coaching video notes
          const coachNotes = docs
            .filter((v) => {
              const up = String(v.uploadedBy || '').trim().toLowerCase();
              const hasNotes = typeof v.notes === 'string' && v.notes.trim().length > 0;
              return up === 'coach' && hasNotes;
            })
            .map((v) => {
              const dt = safeToDate(v.createdAt) || safeToDate(v.createdAtMs);
              return {
                id: v.id,
                coachName: v.coachName,
                skill: v.skill || 'Coaching Video',
                feedback: v.notes, // ✅ show as feedback text
                createdAtLabel: dt ? formatDayDate(dt) : undefined,
                __ts: dt?.getTime?.() ?? 0,
              };
            });

          const all = [...reviewed, ...coachNotes].sort((a, b) => (b.__ts || 0) - (a.__ts || 0));
          latestVideo = all[0] || null;

          compute();
        },
        (e) => {
          console.warn('Recent feedback (videos) listener failed', e);
          latestVideo = null;
          compute();
        }
      );

      const unsubF = onSnapshot(
        qF,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

          const reviewedFitness = docs
            .filter((x) => !!x.coachReviewedAtMs || !!x.coachReviewedAtLabel)
            .map((x) => {
              const dt =
                safeToDate(x.coachReviewedAtMs) ||
                safeToDate(x.coachReviewedAtLabel) ||
                safeToDate(x.completedAtMs) ||
                safeToDate(x.createdAtMs);

              const coachNote =
                typeof x.coachReviewNotes === 'string' && x.coachReviewNotes.trim().length > 0
                  ? x.coachReviewNotes
                  : 'Fitness reviewed by coach.';

              return {
                id: x.id,
                coachName: x.coachName || 'Coach',
                kind: 'Fitness Review',
                feedback: coachNote,
                createdAtLabel: dt ? formatDayDate(dt) : undefined,
                __ts: dt?.getTime?.() ?? 0,
              };
            })
            .sort((a, b) => (b.__ts || 0) - (a.__ts || 0));

          latestFitness = reviewedFitness[0] || null;
          compute();
        },
        (e) => {
          console.warn('Recent feedback (fitness) listener failed', e);
          latestFitness = null;
          compute();
        }
      );

      return () => {
        try { unsubV(); } catch {}
        try { unsubF(); } catch {}
      };
    };

    const unsubUpcoming = loadUpcomingFromSessions();
    const unsubUpcomingLanes = loadUpcomingFromLaneBookings();
    const unsubFeedback = loadRecentFeedbackCombined();

    return () => {
      try { unsubUpcoming?.(); } catch {}
      try { unsubUpcomingLanes?.(); } catch {}
      try { unsubFeedback?.(); } catch {}
    };
  }, [uid, todayKey]);

  const upcomingTypeLabel = upcoming?.kind === 'training' ? 'SELF TRAINING' : 'COACHING';
  const upcomingTypeStyle =
    upcoming?.kind === 'training' ? styles.statusBadgeRequested : styles.statusBadgeAccepted;
  const upcomingLeftLabel =
    upcoming?.kind === 'training'
      ? `🛣️ ${upcoming?.laneName || 'Lane'}`
      : `👤 ${String(upcoming?.coachName || 'Coach')}`;
  const upcomingDateLabel = upcoming?.date
    ? formatDayDateFromYYYYMMDD(upcoming.date)
    : '—';
  const upcomingTimeLabel = upcoming?.start
    ? upcoming?.end
      ? `${upcoming.start}–${upcoming.end}`
      : upcoming.start
    : '';
  const upcomingDateTime = `${upcomingDateLabel}${upcomingTimeLabel ? ` ${upcomingTimeLabel}` : ''}`.trim();

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

  // -----------------------------
  // Player profile details (editable)
  // -----------------------------
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [batSize, setBatSize] = useState('');
  const [batWeight, setBatWeight] = useState('');
  const [battingHand, setBattingHand] = useState('');
  const [bowlingHand, setBowlingHand] = useState('');
  const [padsSize, setPadsSize] = useState('');

  useEffect(() => {
    if (statsModalVisible || profileModalVisible) return;
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
  }, [profile, statsModalVisible, profileModalVisible]);

  useEffect(() => {
    if (profileModalVisible) return;
    setHeightCm(String((profile as any)?.heightCm || ''));
    setWeightKg(String((profile as any)?.weightKg || ''));
    setBatSize(String((profile as any)?.batSize || ''));
    setBatWeight(String((profile as any)?.batWeight || ''));
    setBattingHand(String((profile as any)?.battingHand || ''));
    setBowlingHand(String((profile as any)?.bowlingHand || ''));
    setPadsSize(String((profile as any)?.padsSize || ''));
  }, [profile, profileModalVisible]);

  const openStatsEditor = () => {
    if ((profile as any)?.role && (profile as any)?.role !== 'player') return;
    setStatsModalVisible(true);
  };

  const openProfileEditor = () => {
    if ((profile as any)?.role && (profile as any)?.role !== 'player') return;
    setProfileModalVisible(true);
  };

  const normalizeHand = (v: string) => {
    const t = v.trim().toUpperCase();
    if (!t) return '';
    if (t.startsWith('R')) return 'RH';
    if (t.startsWith('L')) return 'LH';
    return t;
  };

  const saveProfileDetails = async () => {
    if (!uid) return;
    try {
      await updateUserProfile(uid, {
        heightCm: heightCm.trim(),
        weightKg: weightKg.trim(),
        batSize: batSize.trim(),
        batWeight: batWeight.trim(),
        battingHand: normalizeHand(battingHand),
        bowlingHand: normalizeHand(bowlingHand),
        padsSize: padsSize.trim(),
      });
      setProfileModalVisible(false);
    } catch (e: any) {
      Alert.alert('Failed to save profile', e?.message ?? 'Please try again.');
    }
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

  // shimmer
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

  // Pending requests (unchanged)
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  useEffect(() => {
    if (!uid) return;

    const qReq = query(collection(db, 'sessionRequests'), where('playerId', '==', uid), limit(50));

    const unsub = onSnapshot(
      qReq,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

        const nowMs = Date.now();
        const visible = rows.filter((r) => {
          const st = String(r.status || '').toLowerCase();
          const dateKey = String(r.date || '');
          const todayKey = toLocalDateKey(new Date());
          const startAtMs =
            typeof r.startAtMs === 'number'
              ? r.startAtMs
              : parseSessionStartLocal(dateKey, r.slotStart)?.getTime() ?? null;

          if (st === 'requested' || st === 'countered') {
            if (!dateKey) return false;
            if (dateKey > todayKey) return true;
            if (dateKey < todayKey) return false;
            return typeof startAtMs === 'number' ? startAtMs >= nowMs : true;
          }

          if (st === 'accepted' || st === 'declined') {
            if (!dateKey || dateKey !== todayKey) return false;
            return typeof startAtMs === 'number' ? startAtMs >= nowMs : true;
          }

          return false;
        });

        setPendingRequests(visible);
      },
      (err) => {
        console.log('sessionRequests(player) listener error:', err);
        Alert.alert('Listener error', err.message);
      }
    );

    return () => unsub();
  }, [uid]);

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
              <Text style={styles.headerName} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.headerRole} numberOfLines={1}>
                {playerRoleLabel}
              </Text>
              
            </View>

            <Image source={TOPLINE_LOGO} style={styles.headerLogo} />
          </View>
        </View>

        {/* Upcoming Session */}
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>🗓️</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Today's Session</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          {loadingUpcoming ? (
            <View style={styles.toplineSectionCard}>
              <View style={styles.shimmerBox}>
                <Animated.View
                  style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslateX }] }]}
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
              <View style={[styles.statusBadge, upcomingTypeStyle, { marginBottom: 10 }]}>
                <Text style={styles.statusBadgeText}>{upcomingTypeLabel}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.playerPill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.playerPillText} numberOfLines={1}>
                    {upcomingLeftLabel}
                  </Text>
                </View>

                <View style={[styles.playerPill, styles.playerPillTall, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.playerPillTextSm} numberOfLines={2}>
                    🗓 {upcomingDateTime || '—'}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.toplineSectionCard}>
              <Text style={styles.emptyBody}>No sessions today.</Text>
            </View>
          )}
        </View>

        {/* Pending Requests */}
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>⏳</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Session Requests</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            {pendingRequests.length === 0 ? (
              <Text style={styles.emptyBody}>No pending requests.</Text>
            ) : (
              pendingRequests.slice(0, 2).map((r) => {
                const status = String(r.status || '').trim().toLowerCase();
                const statusStyle =
                  status === 'requested' ? styles.statusBadgeRequested :
                  status === 'accepted' ? styles.statusBadgeAccepted :
                  status === 'declined' ? styles.statusBadgeDeclined :
                  status === 'countered' ? styles.statusBadgeCountered :
                  styles.statusBadgeDefault;
                const darkText = status === 'requested';

                return (
                  <View key={r.id} style={[styles.requestItemCard, { marginTop: 10 }]}>
                    <Text style={styles.inputLabel}>
                      {(r.coachName || 'Coach')}    • {r.date ? formatDayDateFromYYYYMMDD(String(r.date)) : '—'} •{' '}
                      {r.slotStart}-{r.slotEnd}
                    </Text>
                    <View style={[styles.statusBadge, styles.requestStatusBadge, statusStyle]}>
                      <Text style={[styles.statusBadgeText, darkText ? styles.statusBadgeTextDark : null]}>
                        {String(r.status || 'status').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Recent Feedback */}
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>💬</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Recent Feedback</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          {loadingFeedback ? (
            <View style={styles.toplineSectionCard}>
              <View style={styles.shimmerBox}>
                <Animated.View
                  style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslateX }] }]}
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
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.playerPill, styles.playerPillTall, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.playerPillTextSm} numberOfLines={2}>
                    🗓 {String(recentFeedback.createdAtLabel || '—')}
                  </Text>
                </View>

                <View style={[styles.playerPill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.playerPillText} numberOfLines={1}>
                    🏏 {String(recentFeedback.skill || 'Practice')}
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
                Your coach’s notes will appear here once a video is reviewed or a coaching video is shared.
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>⚡</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Quick Actions</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.quickActionsCard}>
            <TouchableOpacity
              style={styles.quickActionTile}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('PlayerVideos')}
            >
              <View style={styles.quickActionIconWrap}>
                <Text style={styles.playerQuickActionEmoji}>🎥</Text>
              </View>
              <Text style={styles.quickActionText} numberOfLines={2}>
                My Practice Videos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionTile}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('PlayerCoachingVideos')}
            >
              <View style={styles.quickActionIconWrap}>
                <Text style={styles.playerQuickActionEmoji}>📺</Text>
              </View>
              <Text style={styles.quickActionText} numberOfLines={2}>
                Coaching Videos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionTile}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('PlayerFitness')}
            >
              <View style={styles.quickActionIconWrap}>
                <Text style={styles.playerQuickActionEmoji}>🏋️</Text>
              </View>
              <Text style={styles.quickActionText} numberOfLines={2}>
                Fitness
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionTile}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('PlayerBookSessions')}
            >
              <View style={styles.quickActionIconWrap}>
                <Text style={styles.playerQuickActionEmoji}>📅</Text>
              </View>
              <Text style={styles.quickActionText} numberOfLines={2}>
                Session Booking
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats (unchanged) */}
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>🧰</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Player Profile</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.card}>
            <View style={styles.statsHeaderRow}>
              <Text style={styles.statsCardTitle}>Equipment & Bio</Text>
              <TouchableOpacity onPress={openProfileEditor} activeOpacity={0.8}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsTable}>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Height</Text>
                <Text style={styles.statsValue}>{heightCm ? `${heightCm} cm` : '—'}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Weight</Text>
                <Text style={styles.statsValue}>{weightKg ? `${weightKg} kg` : '—'}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Bat Size</Text>
                <Text style={styles.statsValue}>{batSize || '—'}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Bat Weight</Text>
                <Text style={styles.statsValue}>{batWeight || '—'}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Batting Hand</Text>
                <Text style={styles.statsValue}>{battingHand ? battingHand.toUpperCase() : '—'}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Bowling Hand</Text>
                <Text style={styles.statsValue}>{bowlingHand ? bowlingHand.toUpperCase() : '—'}</Text>
              </View>
              <View style={[styles.statsRow, styles.statsRowLast]}>
                <Text style={styles.statsLabel}>Pads Size</Text>
                <Text style={styles.statsValue}>{padsSize || '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>📊</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Stats</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

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
                <Text style={styles.statsLabel}>Highest Score</Text>
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
            <TouchableOpacity style={styles.statsButton} activeOpacity={0.9} onPress={openStatsEditor}>
              <Text style={styles.statsButtonText}>Add key stats manually</Text>
            </TouchableOpacity>
          )}
          </View>
        </View>

        {/* Stats Modal (unchanged) */}
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

        {/* Player Profile Modal */}
        <Modal visible={profileModalVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Update Profile</Text>

              <View style={styles.modalRow}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="number-pad"
                    placeholder="e.g. 170"
                  />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={weightKg}
                    onChangeText={setWeightKg}
                    keyboardType="number-pad"
                    placeholder="e.g. 65"
                  />
                </View>
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Bat Size</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={batSize}
                    onChangeText={setBatSize}
                    placeholder="e.g. SH / Harrow"
                  />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Bat Weight</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={batWeight}
                    onChangeText={setBatWeight}
                    placeholder="e.g. 2lb 8oz"
                  />
                </View>
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Batting Hand</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={battingHand}
                    onChangeText={setBattingHand}
                    placeholder="RH / LH"
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </View>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Bowling Hand</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={bowlingHand}
                    onChangeText={setBowlingHand}
                    placeholder="RH / LH"
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </View>
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Pads Size</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={padsSize}
                    onChangeText={setPadsSize}
                    placeholder="e.g. Youth / Adult"
                  />
                </View>
              </View>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={() => setProfileModalVisible(false)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={saveProfileDetails}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalBtnPrimaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <TouchableOpacity
        style={styles.floatingLaneButton}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('PlayerBookLanes')}
      >
        <Text style={styles.floatingLaneButtonIcon}>🛣️</Text>
        <Text style={styles.floatingLaneButtonText}>Book Lane</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
