// src/screens/CoachDashboardScreen.body.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../types';
import { styles } from '../styles/styles';
import HeroHeader from '../components/HeroHeader';
import { initialsFromName, toTitleCaseName } from '../utils/text';
import { toplineLogo } from '../constants/assets';
import { formatDayDate } from '../utils/dateFormatter';

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
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

  date?: string;   // YYYY-MM-DD (local)
  start?: string;  // "09:00"
  end?: string;    // "10:00"
  status?: string; // "upcoming"

  createdAtMs?: number;
  createdAtLabel?: string;
};

type ReviewItem = {
  kind: 'video' | 'fitness';
  playerId: string;
  playerName: string;
  createdAtMs: number;
};

function toLocalDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`; // local YYYY-MM-DD
}

function startOfTodayLocalMs() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return start.getTime();
}

// ✅ helper: convert "YYYY-MM-DD" -> Date (local)
function parseYYYYMMDDLocal(s?: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
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
  const [sessionsToday, setSessionsToday] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);

  // Lists
  const [todaySessionsList, setTodaySessionsList] = useState<Session[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

  // ✅ local date key (fixes “yesterday” problem)
  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const todayStartMs = useMemo(() => startOfTodayLocalMs(), []);

  // ✅ label: "Tue, 03-Feb-2026"
  const todayLabel = useMemo(() => formatDayDate(parseYYYYMMDDLocal(todayKey) || new Date()), [todayKey]);

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
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Session[];
        rows.sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));
        setSessionsToday(rows.length);
        setTodaySessionsList(rows);
      },
      (err) => {
        console.log('CoachDashboard sessions listener error:', err);
        setSessionsToday(0);
        setTodaySessionsList([]);
      }
    );

    // -------------------------
    // 2) Review items:
    //    Videos pending + Fitness logs today
    // -------------------------
    let pendingVideos: ReviewItem[] = [];
    let pendingFitness: ReviewItem[] = [];

    const recompute = () => {
      // Merge + dedupe by (playerId + kind)
      const seen = new Set<string>();
      const merged = [...pendingVideos, ...pendingFitness]
        .filter(x => !!x.playerId)
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
        .filter(x => {
          const key = `${x.playerId}_${x.kind}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      setReviewItems(merged);
      setPendingReviews(merged.length);

      // Unique players count from review activity
      const playersSet = new Set<string>();
      merged.forEach(x => playersSet.add(x.playerId));
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
        pendingVideos = snap.docs.map(d => {
          const data: any = d.data();
          return {
            kind: 'video' as const,
            playerId: String(data.playerId || ''),
            playerName: String(data.playerName || 'Player'),
            createdAtMs: Number(data.createdAtMs || 0),
          };
        }).filter(x => !!x.playerId);
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
        pendingFitness = snap.docs.map(d => {
          const data: any = d.data();
          return {
            kind: 'fitness' as const,
            playerId: String(data.playerId || ''),
            playerName: String(data.playerName || 'Player'),
            createdAtMs: Number(data.createdAtMs || 0),
          };
        }).filter(x => !!x.playerId);
        recompute();
      },
      (err) => {
        console.log('CoachDashboard fitness listener error:', err);
        pendingFitness = [];
        recompute();
      }
    );

    return () => {
      unsubSessions();
      unsubVideos();
      unsubFitness();
    };
  }, [firebaseUser?.uid, todayKey, todayStartMs]);

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <HeroHeader initials={coachInitials} name={displayName} logoSource={toplineLogo} />

        {/* Upcoming sessions (Today) */}
        <Text style={styles.sectionTitle}>Upcoming sessions ({todayLabel})</Text>
        <View style={styles.playerCard}>
          {todaySessionsList.length === 0 ? (
            <Text style={styles.playerCardEmptyText}>No sessions scheduled for today yet.</Text>
          ) : (
            <>
              <Text style={styles.playerCardTitle}>Today’s sessions</Text>
              {todaySessionsList.slice(0, 4).map(s => (
                <View key={s.id} style={{ marginTop: 8 }}>
                  <Text style={styles.playerCardSubtitle}>⏰ {s.start} – {s.end}</Text>
                  <Text style={styles.playerCardBodyText}>🏏 {s.playerName || 'Player'}</Text>
                </View>
              ))}
              {todaySessionsList.length > 4 ? (
                <Text style={[styles.playerCardBodyText, { marginTop: 8 }]}>
                  + {todaySessionsList.length - 4} more
                </Text>
              ) : null}
            </>
          )}
        </View>

        {/* Players needing review */}
        <Text style={styles.sectionTitle}>Reviews Requested</Text>
        <View style={styles.playerCard}>
          {reviewItems.length === 0 ? (
            <Text style={styles.playerCardEmptyText}>
              When players upload new videos or log fitness sessions, they will appear here.
            </Text>
          ) : (
            <>
              <Text style={styles.playerCardTitle}>Pending reviews</Text>

              {reviewItems.slice(0, 6).map((r, idx) => (
                <Text key={`${r.playerId}_${r.kind}_${idx}`} style={styles.playerCardBodyText}>
                  • {r.playerName} - {r.kind === 'video' ? 'Video' : 'Fitness'}
                </Text>
              ))}

              {reviewItems.length > 6 ? (
                <Text style={[styles.playerCardSubtitle, { marginTop: 6 }]}>
                  + {reviewItems.length - 6} more
                </Text>
              ) : null}
            </>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.playerQuickActionsCard}>
          <View style={styles.playerQuickActionsRow}>
            <TouchableOpacity
              style={styles.playerQuickActionTile}
              onPress={() => navigation.navigate('CoachVideoReview')}
            >
              <Text style={styles.playerQuickActionEmoji}>🎥</Text>
              <Text style={styles.playerQuickActionText}>Review Videos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playerQuickActionTile}
              onPress={() => navigation.navigate('CoachFitness')}
            >
              <Text style={styles.playerQuickActionEmoji}>🏋️</Text>
              <Text style={styles.playerQuickActionText}>Review Fitness</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playerQuickActionTile}
              onPress={() => navigation.navigate('CoachAvailability')}
            >
              <Text style={styles.playerQuickActionEmoji}>📅</Text>
              <Text style={styles.playerQuickActionText}>Availabilty</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playerQuickActionTile}
              onPress={() => navigation.navigate('CoachBookingRequests')}
            >
              <Text style={styles.playerQuickActionEmoji}>📥</Text>
              <Text style={styles.playerQuickActionText}>Booking Requests</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={styles.playerWelcomeSubText}>
              Players: {totalPlayers} • Pending reviews: {pendingReviews}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CoachDashboardScreenBody;