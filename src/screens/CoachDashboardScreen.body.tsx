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

import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CoachDashboard'>;
};

const CoachDashboardScreenBody: React.FC<Props> = ({ navigation }) => {
  const { firebaseUser, user } = useAuth(); // user is your backward-compatible alias to profile

  const displayName =
    user?.firstName || user?.lastName
      ? toTitleCaseName(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim())
      : 'Coach';

  const coachInitials = useMemo(() => initialsFromName(displayName, 'C'), [displayName]);

  // ✅ Firestore-backed metrics (no UX changes)
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) return;

    // 1) Sessions today (sessions collection)
    const sessionsQ = query(
      collection(db, 'sessions'),
      where('coachId', '==', uid),
      where('dateKey', '==', todayKey)
    );

    const unsubSessions = onSnapshot(
      sessionsQ,
      (snap) => setSessionsToday(snap.size),
      () => setSessionsToday(0)
    );

    // 2) Pending reviews (videos collection)
    // Expecting docs to have: coachId, reviewed:boolean
    const reviewsQ = query(
      collection(db, 'videos'),
      where('coachId', '==', uid),
      where('reviewed', '==', false)
    );

    const unsubReviews = onSnapshot(
      reviewsQ,
      (snap) => setPendingReviews(snap.size),
      () => setPendingReviews(0)
    );

    // 3) Total players (coachPlayers collection) - optional
    // Expecting docs to have: coachId, playerId
    const playersQ = query(
      collection(db, 'coachPlayers'),
      where('coachId', '==', uid)
    );

    const unsubPlayers = onSnapshot(
      playersQ,
      (snap) => setTotalPlayers(snap.size),
      () => setTotalPlayers(0)
    );

    return () => {
      unsubSessions();
      unsubReviews();
      unsubPlayers();
    };
  }, [firebaseUser?.uid, todayKey]);

  const hasTodaySessions = sessionsToday > 0;
  const hasPendingReviews = pendingReviews > 0;

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <HeroHeader
          initials={coachInitials}
          name={`Coach ${displayName}`}
          logoSource={toplineLogo}
        />

        {/* Today at Topline */}
        <Text style={styles.sectionTitle}>Today at Topline</Text>
        <View style={styles.playerCard}>
          {hasTodaySessions ? (
            <>
              <Text style={styles.playerCardTitle}>Sessions scheduled</Text>
              <Text style={styles.playerCardSubtitle}>
                📅 {sessionsToday} total sessions
              </Text>
              <Text style={styles.playerCardBodyText}>📍 Topline Cricket Centre</Text>
            </>
          ) : (
            <Text style={styles.playerCardEmptyText}>
              No sessions added for today yet.
            </Text>
          )}
        </View>

        {/* Players needing review */}
        <Text style={styles.sectionTitle}>Players needing review</Text>
        <View style={styles.playerCard}>
          {hasPendingReviews ? (
            <>
              <Text style={styles.playerCardTitle}>Pending reviews</Text>
              <Text style={styles.playerCardBodyText}>
                • New practice videos waiting for review
              </Text>
              <Text style={styles.playerCardBodyText}>
                • Players who updated their fitness log today
              </Text>
            </>
          ) : (
            <Text style={styles.playerCardEmptyText}>
              When players upload new videos or log fitness sessions, they will appear here.
            </Text>
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
              // keep as-is for now, but ideally route to a CoachFitnessReview screen later
              onPress={() => navigation.navigate('PlayerFitness')}
            >
              <Text style={styles.playerQuickActionEmoji}>🏋️</Text>
              <Text style={styles.playerQuickActionText}>Review Fitness</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playerQuickActionTile}
              onPress={() => {
                // later: navigate to AddSession screen
              }}
            >
              <Text style={styles.playerQuickActionEmoji}>📅</Text>
              <Text style={styles.playerQuickActionText}>Add Session</Text>
            </TouchableOpacity>
          </View>

          {/* optional small stats row (kept) */}
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
