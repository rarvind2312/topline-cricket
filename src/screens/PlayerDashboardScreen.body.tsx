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
import { updatePlayerKeyStats } from '../services/userProfile';

// ✅ shared date utils
import {
  safeToDate,
  formatDayDateTime,
  formatDayDateFromYYYYMMDD,
} from '../utils/dateFormatter';

const TOPLINE_LOGO = require('../../assets/topline-cricket-image.jpg');

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerDashboard'>;

type UpcomingSession = {
  id: string;
  skill?: string;
  coachName?: string;
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

    // ✅ Upcoming Session — from sessions (date/start/end/status)
    const loadUpcomingFromSessions = () => {
      setLoadingUpcoming(true);

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
              return st === 'upcoming' || st === 'scheduled';
            })
            .map((s) => {
              const startDt = parseSessionStartLocal(s.date, s.start);
              return { ...s, _startDt: startDt };
            })
            .filter((s) => !!s._startDt && s._startDt.getTime() >= nowMs)
            .sort((a, b) => a._startDt.getTime() - b._startDt.getTime())[0];

          setUpcoming(
            candidate
              ? {
                  id: candidate.id,
                  coachName: candidate.coachName,
                  skill: candidate.skill,
                  date: candidate.date,
                  start: candidate.start,
                  end: candidate.end,
                  status: candidate.status,
                }
              : null
          );

          setLoadingUpcoming(false);
        },
        (e) => {
          console.warn('Upcoming sessions listener failed', e);
          setUpcoming(null);
          setLoadingUpcoming(false);
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
              const hasFeedback =
                typeof v.feedback === 'string' && v.feedback.trim().length > 0;
              return status === 'reviewed' && hasFeedback;
            })
            .map((v) => {
              const dt = safeToDate(v.reviewedAt) || safeToDate(v.createdAt) || safeToDate(v.createdAtMs);
              return {
                id: v.id,
                coachName: v.coachName,
                skill: v.skill || 'Practice',
                feedback: v.feedback,
                createdAtLabel: dt ? formatDayDateTime(dt) : undefined,
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
                createdAtLabel: dt ? formatDayDateTime(dt) : undefined,
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
            .filter((x) => {
              // only entries coach reviewed
              return !!x.coachReviewedAtMs || !!x.coachReviewedAtLabel;
            })
            .map((x) => {
              const dt =
                safeToDate(x.coachReviewedAtMs) ||
                safeToDate(x.coachReviewedAtLabel) ||
                safeToDate(x.completedAtMs) ||
                safeToDate(x.createdAtMs);

              // If later you store a coach note, show it here:
              const coachNote =
                typeof x.coachReviewNotes === 'string' && x.coachReviewNotes.trim().length > 0
                  ? x.coachReviewNotes
                  : 'Fitness reviewed by coach.';

              return {
                id: x.id,
                coachName: x.coachName || 'Coach',
                kind: 'Fitness Review',
                feedback: coachNote,
                createdAtLabel: dt ? formatDayDateTime(dt) : undefined,
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
    const unsubFeedback = loadRecentFeedbackCombined();

    return () => {
      try { unsubUpcoming?.(); } catch {}
      try { unsubFeedback?.(); } catch {}
    };
  }, [uid]);

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

        const visible = rows.filter((r) =>
          ['requested', 'countered'].includes(String(r.status || '').toLowerCase())
        );

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

          <View style={styles.sectionBlock}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.bigTitle}>{upcoming.skill || 'Session'}</Text>
                  <View style={[styles.pill, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={styles.pillText}>
                      {String(upcoming.status || 'UPCOMING').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={styles.pillText}>👤 {String(upcoming.coachName || '—')}</Text>
                  </View>

                  <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={styles.pillText}>
                      🗓{' '}
                      {upcoming.date
                        ? `${formatDayDateFromYYYYMMDD(upcoming.date)} ${upcoming.start ?? ''}`.trim()
                        : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.toplineSectionCard}>
                <Text style={styles.emptyBody}>No Upcoming Sessions yet.</Text>
              </View>
            )}
          </View>
        </>

        {/* Pending Requests */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Pending Requests</Text>
        <View style={[styles.toplineSectionCard, { marginTop: 10 }]}>
          {pendingRequests.length === 0 ? (
            <Text style={styles.emptyBody}>No pending requests.</Text>
          ) : (
            pendingRequests.slice(0, 2).map((r) => (
              <View key={r.id} style={{ marginTop: 10 }}>
                <Text style={styles.inputLabel}>
                  {r.coachName || 'Coach'} • {r.date ? formatDayDateFromYYYYMMDD(String(r.date)) : '—'} •{' '}
                  {r.slotStart}-{r.slotEnd}
                </Text>
                <Text style={styles.playerWelcomeSubText}>
                  Status: {String(r.status).toUpperCase()}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Recent Feedback */}
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Feedback</Text>
          </View>

          <View style={styles.sectionBlock}>
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
                  <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={styles.pillText}>🗓 {String(recentFeedback.createdAtLabel || '—')}</Text>
                  </View>

                  <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={styles.pillText}>🏏 {String(recentFeedback.skill || 'Practice')}</Text>
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
            <Text style={styles.quickActionText}>My Practice Videos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionTile}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PlayerCoachingVideos')}
          >
            <Text style={styles.quickActionEmoji}>📺</Text>
            <Text style={styles.quickActionText}>Coaching Videos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionTile}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PlayerFitness')}
          >
            <Text style={styles.quickActionEmoji}>❤️‍🔥</Text>
            <Text style={styles.quickActionText}>Fitness</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionTile}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PlayerBookSessions')}
          >
            <Text style={styles.quickActionEmoji}>📅</Text>
            <Text style={styles.quickActionText}>Session Booking</Text>
          </TouchableOpacity>
        </View>

        {/* Stats (unchanged) */}
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
            <TouchableOpacity style={styles.statsButton} activeOpacity={0.9} onPress={openStatsEditor}>
              <Text style={styles.statsButtonText}>Add key stats manually</Text>
            </TouchableOpacity>
          )}
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
      </ScrollView>
    </SafeAreaView>
  );
}