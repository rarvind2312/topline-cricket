// src/screens/CoachDashboardScreen.body.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../types';
import { styles } from '../styles/styles';
import { initialsFromName, toTitleCaseName } from '../utils/text';
import { toplineLogo } from '../constants/assets';
import { formatDayDate } from '../utils/dateFormatter';

import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CoachDashboard'>;
};

type Session = {
  id: string;
  playerId?: string;
  playerName?: string;
  coachId?: string;
  coachName?: string;
  laneName?: string;
  source?: 'session' | 'lane';

  date?: string; // YYYY-MM-DD (local)
  start?: string; // "09:00"
  end?: string; // "10:00"
  status?: string; // "upcoming"
  requestId?: string;
  startAtMs?: number | null;

  createdAtMs?: number;
  createdAtLabel?: string;
};

type ReviewItem = {
  kind: 'video' | 'fitness';
  playerId: string;
  playerName: string;
  createdAtMs: number;
};

type BookingRequest = {
  id: string;
  playerId?: string;
  playerName?: string;
  coachId?: string;
  date?: string; // YYYY-MM-DD
  slotStart?: string;
  slotEnd?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
  status?: string;
};

function toLocalDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfTodayLocalMs() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return start.getTime();
}

function parseYYYYMMDDLocal(s?: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseSessionStartLocalMs(dateStr?: string, startHHMM?: string): number | null {
  if (!dateStr || !startHHMM) return null;
  const [y, mo, da] = dateStr.split('-').map(Number);
  const [h, mi] = startHHMM.split(':').map(Number);
  if (!y || !mo || !da || Number.isNaN(h) || Number.isNaN(mi)) return null;
  const d = new Date(y, mo - 1, da, h, mi, 0, 0);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

const CoachDashboardScreenBody: React.FC<Props> = ({ navigation }) => {
  const { firebaseUser, user } = useAuth();

  const displayName =
    user?.firstName || user?.lastName
      ? toTitleCaseName(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim())
      : 'Coach';

  const coachInitials = useMemo(() => initialsFromName(displayName, 'C'), [displayName]);

  // Metrics
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);

  // Lists
  const [todaySessionsList, setTodaySessionsList] = useState<Session[]>([]);
  const [laneBookingsTodayList, setLaneBookingsTodayList] = useState<Session[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [latestRequest, setLatestRequest] = useState<BookingRequest | null>(null);

  // ✅ local date key
  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const todayStartMs = useMemo(() => startOfTodayLocalMs(), []);
  const todayLabel = useMemo(
    () => formatDayDate(parseYYYYMMDDLocal(todayKey) || new Date()),
    [todayKey]
  );

  const combinedTodaySessions = useMemo(() => {
    const merged = [...todaySessionsList, ...laneBookingsTodayList];
    merged.sort((a, b) => {
      const aMs = typeof a.startAtMs === 'number' ? a.startAtMs : 0;
      const bMs = typeof b.startAtMs === 'number' ? b.startAtMs : 0;
      if (aMs && bMs) return aMs - bMs;
      return String(a.start || '').localeCompare(String(b.start || ''));
    });
    return merged;
  }, [todaySessionsList, laneBookingsTodayList]);

  const sessionsToday = combinedTodaySessions.length;

  const formatRequestDate = (dateKey?: string) => {
    const dt = parseYYYYMMDDLocal(dateKey);
    return dt ? formatDayDate(dt) : String(dateKey || '—');
  };

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) return;

    // -------------------------
    // 1) Today's sessions
    // -------------------------
    const sessionsQ = query(
      collection(db, 'sessions'),
      where('coachId', '==', uid),
      where('date', '==', todayKey)
    );

    const unsubSessions = onSnapshot(
      sessionsQ,
      (snap) => {
        const nowMs = Date.now();
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Session[];
        const seen = new Set<string>();
        const unique = rows.filter((r) => {
          const slotKey =
            r.requestId
              ? `req_${r.requestId}`
              : r.playerId || r.date || r.start || r.end
                ? `slot_${r.playerId || ''}_${r.date || ''}_${r.start || ''}_${r.end || ''}`
                : `id_${r.id}`;
          if (seen.has(slotKey)) return false;
          seen.add(slotKey);
          return true;
        });
        const withStart = unique
          .map((r) => {
            const startAtMs =
              typeof r.startAtMs === 'number'
                ? r.startAtMs
                : parseSessionStartLocalMs(r.date, r.start);
            return { ...r, startAtMs };
          })
          .filter((r) => (typeof r.startAtMs === 'number' ? r.startAtMs >= nowMs : true));

        withStart.sort((a, b) => {
          const aMs = typeof a.startAtMs === 'number' ? a.startAtMs : 0;
          const bMs = typeof b.startAtMs === 'number' ? b.startAtMs : 0;
          if (aMs && bMs) return aMs - bMs;
          return String(a.start || '').localeCompare(String(b.start || ''));
        });

        setTodaySessionsList(withStart);
      },
      (err) => {
        console.log('CoachDashboard sessions listener error:', err);
        setTodaySessionsList([]);
      }
    );

    // -------------------------
    // 1b) Today's lane bookings (coach-created, no sessionId)
    // -------------------------
    const laneBookingsQ = query(
      collection(db, 'laneBookings'),
      where('coachId', '==', uid),
      where('date', '==', todayKey)
    );

    const unsubLaneBookings = onSnapshot(
      laneBookingsQ,
      (snap) => {
        const nowMs = Date.now();
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
        const mapped = rows
          .filter((b) => String(b.status || '').toLowerCase() !== 'cancelled')
          .filter((b) => String(b.bookingType || '').toLowerCase() === 'coaching')
          .filter((b) => !b.sessionId)
          .map((b) => {
            const startAtMs = parseSessionStartLocalMs(b.date, b.start);
            return {
              id: `lane_${b.id}`,
              playerId: b.playerId,
              playerName: b.playerName,
              coachId: b.coachId,
              coachName: b.coachName,
              laneName: b.laneName,
              date: b.date,
              start: b.start,
              end: b.end,
              status: b.status,
              startAtMs,
              source: 'lane' as const,
            } as Session;
          })
          .filter((r) => (typeof r.startAtMs === 'number' ? r.startAtMs >= nowMs : true));

        mapped.sort((a, b) => {
          const aMs = typeof a.startAtMs === 'number' ? a.startAtMs : 0;
          const bMs = typeof b.startAtMs === 'number' ? b.startAtMs : 0;
          if (aMs && bMs) return aMs - bMs;
          return String(a.start || '').localeCompare(String(b.start || ''));
        });

        setLaneBookingsTodayList(mapped);
      },
      (err) => {
        console.log('CoachDashboard lane bookings listener error:', err);
        setLaneBookingsTodayList([]);
      }
    );

    // -------------------------
    // 2) Review items: videos pending + fitness today
    // -------------------------
    let pendingVideos: ReviewItem[] = [];
    let pendingFitness: ReviewItem[] = [];

    const recompute = () => {
      const seen = new Set<string>();
      const merged = [...pendingVideos, ...pendingFitness]
        .filter((x) => !!x.playerId)
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
        .filter((x) => {
          const key = `${x.playerId}_${x.kind}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      setReviewItems(merged);
      setPendingReviews(merged.length);

      const playersSet = new Set<string>();
      merged.forEach((x) => playersSet.add(x.playerId));
      setTotalPlayers(playersSet.size);
    };

    // 2a) Pending videos
    const videosQ = query(
      collection(db, 'videos'),
      where('coachId', '==', uid),
      where('status', '==', 'submitted')
    );

    const unsubVideos = onSnapshot(
      videosQ,
      (snap) => {
        pendingVideos = snap.docs
          .map((d) => {
            const data: any = d.data();
            return {
              kind: 'video' as const,
              playerId: String(data.playerId || ''),
              playerName: String(data.playerName || 'Player'),
              createdAtMs: Number(data.createdAtMs || 0),
            };
          })
          .filter((x) => !!x.playerId);
        recompute();
      },
      (err) => {
        console.log('CoachDashboard videos listener error:', err);
        pendingVideos = [];
        recompute();
      }
    );

    // 2b) Fitness logs today (player submissions)
    const fitnessQ = query(
      collection(db, 'fitnessEntries'),
      where('coachId', '==', uid),
      where('source', '==', 'player'),
      where('createdAtMs', '>=', todayStartMs),
      orderBy('createdAtMs', 'desc'),
      limit(50)
    );

    const unsubFitness = onSnapshot(
      fitnessQ,
      (snap) => {
        pendingFitness = snap.docs
          .map((d) => {
            const data: any = d.data();
            return {
              kind: 'fitness' as const,
              playerId: String(data.playerId || ''),
              playerName: String(data.playerName || 'Player'),
              createdAtMs: Number(data.createdAtMs || 0),
            };
          })
          .filter((x) => !!x.playerId);
        recompute();
      },
      (err) => {
        console.log('CoachDashboard fitness listener error:', err);
        pendingFitness = [];
        recompute();
      }
    );

    return () => {
      try { unsubSessions(); } catch {}
      try { unsubLaneBookings(); } catch {}
      try { unsubVideos(); } catch {}
      try { unsubFitness(); } catch {}
    };
  }, [firebaseUser?.uid, todayKey, todayStartMs]);

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) return;

    const reqQ = query(
      collection(db, 'sessionRequests'),
      where('coachId', '==', uid),
      limit(200)
    );

    const unsub = onSnapshot(
      reqQ,
      (snap) => {
        if (snap.empty) {
          setLatestRequest(null);
          return;
        }
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as BookingRequest[];
        const requested = rows.filter(r => String(r.status || '').trim().toLowerCase() === 'requested');
        requested.sort((a, b) => {
          const aMs = Number(a.createdAtMs || a.updatedAtMs || 0);
          const bMs = Number(b.createdAtMs || b.updatedAtMs || 0);
          return bMs - aMs;
        });
        setLatestRequest(requested[0] ?? null);
      },
      (err) => {
        console.log('CoachDashboard booking request listener error:', err);
        setLatestRequest(null);
      }
    );

    return () => unsub();
  }, [firebaseUser?.uid]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Premium header (match Player dashboard) */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{coachInitials}</Text>
            </View>

            <View style={styles.headerTextBlock}>
              <Text style={styles.headerName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.headerRole} numberOfLines={1}>
                Coach
              </Text>
            </View>

            <Image source={toplineLogo} style={styles.headerLogo} />
          </View>
        </View>

        {/* Upcoming Sessions (today) */}
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>🗓️</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Upcoming Sessions</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          {combinedTodaySessions.length === 0 ? (
            <View style={styles.toplineSectionCard}>
              <Text style={styles.emptyBody}>No sessions scheduled for today yet.</Text>
            </View>
          ) : (
            <View style={styles.toplineSectionCard}>
              <View style={styles.titleRow}>
                <Text style={styles.coachBigTitle}>Today’s sessions</Text>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{String(sessionsToday)} TOTAL</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {combinedTodaySessions.slice(0, 4).map((s) => (
                <View key={s.id} style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={styles.pillText}>⏰ {s.start} – {s.end}</Text>
                    </View>

                    <View style={[styles.pill, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={styles.pillText} numberOfLines={1}>
                        🏏 {s.playerName || 'Player'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {combinedTodaySessions.length > 4 ? (
                <Text style={[styles.playerWelcomeSubText, { marginTop: 10 }]}>
                  + {combinedTodaySessions.length - 4} more
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Booking Requests (latest only) */}
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>📥</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Booking Requests</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          {latestRequest ? (
            <View style={styles.toplineSectionCard}>
              <View style={styles.titleRow}>
                <Text style={styles.coachBigTitle}>Latest request</Text>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>PENDING</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.inputLabel}>
                {latestRequest.playerName || 'Player'}
              </Text>
              <Text style={styles.playerWelcomeSubText}>
                {formatRequestDate(latestRequest.date)} • {latestRequest.slotStart} – {latestRequest.slotEnd}
              </Text>

              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 10 }]}
                onPress={() => navigation.navigate('CoachBookingRequests')}
              >
                <Text style={styles.secondaryButtonText}>View booking requests</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.toplineSectionCard}>
              <Text style={styles.emptyBody}>No booking requests right now.</Text>
              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 10 }]}
                onPress={() => navigation.navigate('CoachBookingRequests')}
              >
                <Text style={styles.secondaryButtonText}>Open booking requests</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Reviews Requested */}
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>✅</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Reviews Requested</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          {reviewItems.length === 0 ? (
            <View style={styles.toplineSectionCard}>
              <Text style={styles.emptyTitle}>No pending reviews</Text>
              <Text style={styles.emptyBody}>
                When players upload new videos or log fitness sessions, they will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.toplineSectionCard}>
              <View style={styles.titleRow}>
                <Text style={styles.coachBigTitle}>Pending reviews</Text>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{String(pendingReviews)} PENDING</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {reviewItems.slice(0, 6).map((r, idx) => (
                <Text
                  key={`${r.playerId}_${r.kind}_${idx}`}
                  style={styles.playerWelcomeSubText}
                >
                  • {r.playerName} — {r.kind === 'video' ? 'Video' : 'Fitness'}
                </Text>
              ))}

              {reviewItems.length > 6 ? (
                <Text style={[styles.playerWelcomeSubText, { marginTop: 8 }]}>
                  + {reviewItems.length - 6} more
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Quick Actions (match player tile style) */}
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
              onPress={() => navigation.navigate('CoachVideoReview')}
            >
              <View style={styles.quickActionIconWrap}>
                <Text style={styles.quickActionEmoji}>🎥</Text>
              </View>
              <Text style={styles.quickActionText} numberOfLines={2}>
                Review Videos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionTile}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('CoachFitness')}
            >
              <View style={styles.quickActionIconWrap}>
                <Text style={styles.quickActionEmoji}>🏋️</Text>
              </View>
              <Text style={styles.quickActionText} numberOfLines={2}>
                Review Fitness
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionTile}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('CoachAvailability')}
            >
              <View style={styles.quickActionIconWrap}>
                <Text style={styles.quickActionEmoji}>📅</Text>
              </View>
              <Text style={styles.quickActionText} numberOfLines={2}>
                Availability
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionTile}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('CoachBookingRequests')}
            >
              <View style={styles.quickActionIconWrap}>
                <Text style={styles.quickActionEmoji}>📥</Text>
              </View>
              <Text style={styles.quickActionText} numberOfLines={2}>
                Booking Requests
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.floatingLaneButton}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('CoachBookLanes')}
      >
        <Text style={styles.floatingLaneButtonIcon}>🛣️</Text>
        <Text style={styles.floatingLaneButtonText}>Book Lane</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default CoachDashboardScreenBody;
