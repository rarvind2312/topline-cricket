import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View, TouchableOpacity, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';

import { styles } from '../styles/styles';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { safeToDate, formatDayDateTime } from '../utils/dateFormatter';

const TOPLINE_LOGO = require('../../assets/topline-cricket-image.jpg');

export default function PlayerCoachingVideosScreenBody({ navigation }: any) {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid || '';

  const [coachVideos, setCoachVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) return;

    setLoading(true);

    const q1 = query(
      collection(db, 'videos'),
      where('playerId', '==', uid),
      where('uploadedBy', '==', 'coach'),
      limit(50)
    );

    const unsub = onSnapshot(
      q1,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

        // newest first (no orderBy to avoid index)
        list.sort((a, b) => {
          const ta =
            safeToDate(a.createdAt)?.getTime() ??
            (typeof a.createdAtMs === 'number' ? a.createdAtMs : 0);
          const tb =
            safeToDate(b.createdAt)?.getTime() ??
            (typeof b.createdAtMs === 'number' ? b.createdAtMs : 0);
          return tb - ta;
        });

        setCoachVideos(list);
        setLoading(false);
      },
      (err) => {
        console.log('coach videos listener error:', err);
        setCoachVideos([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <View style={styles.topRightLogoContainer}>
          <Image source={TOPLINE_LOGO} style={styles.topRightLogo} />
        </View>

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>📺</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Coaching Videos</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          {loading ? (
            <Text style={styles.playerWelcomeSubText}>Loading…</Text>
          ) : coachVideos.length === 0 ? (
            <Text style={styles.playerCardEmptyText}>No coaching videos shared yet.</Text>
          ) : (
            <View style={{ marginTop: 10 }}>
              {coachVideos.map((v) => {
                const dt =
                  safeToDate(v?.createdAt) ||
                  safeToDate(v?.createdAtMs) ||
                  (v?.createdAtLabel ? safeToDate(String(v.createdAtLabel)) : null);

                const dateLabel = dt ? formatDayDateTime(dt) : '';

                return (
                  <View key={v.id} style={styles.videoItemCard}>
                    <Text style={styles.videoItemTitle}>
                      {v.coachName || 'Coach'}
                      {dateLabel ? `  •  ${dateLabel}` : ''}
                    </Text>

                    <Video
                      source={{ uri: v.videoUrl }}
                      style={styles.videoPlayer}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                    />

                    {v.notes ? (
                      <Text style={styles.playerWelcomeSubText}>{v.notes}</Text>
                    ) : (
                      <Text style={styles.playerWelcomeSubText}>No notes added.</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>⬅ Return to Player Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
