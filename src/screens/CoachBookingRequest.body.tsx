import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { styles } from '../styles/styles';
import type { RootStackParamList } from '../types';
import { formatDayDate } from '../utils/dateFormatter';
import { toplineLogo } from '../constants/assets';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachBookingRequests'>;

type SessionRequest = {
  id: string;
  playerId: string;
  playerName: string;
  coachId: string;
  coachName: string;

  date: string;        // YYYY-MM-DD
  slotStart: string;   // "10:00"
  slotEnd: string;     // "11:00"

  status: 'requested' | 'accepted' | 'declined' | 'countered' | 'cancelled';

  createdAtMs?: number;
  updatedAtMs?: number;
};

export default function CoachBookingRequestsScreenBody({ navigation }: Props) {
  const { firebaseUser, profile } = useAuth();
  const coachId = firebaseUser?.uid || '';

  const coachName = useMemo(() => {
    const fn = (profile as any)?.firstName || '';
    const ln = (profile as any)?.lastName || '';
    const full = `${fn} ${ln}`.trim();
    return full || (profile as any)?.email || 'Coach';
  }, [profile]);

  const [requests, setRequests] = useState<SessionRequest[]>([]);

  const parseYYYYMMDD = (s: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const formatRequestDate = (dateKey: string) => {
    const dt = parseYYYYMMDD(dateKey);
    return dt ? formatDayDate(dt) : String(dateKey || '—');
  };

  useEffect(() => {
    if (!coachId) return;

    const qReq = query(
      collection(db, 'sessionRequests'),
      where('coachId', '==', coachId),
      where('status', '==', 'requested'),
      orderBy('createdAtMs', 'asc')
    );

    const unsub = onSnapshot(
      qReq,
      snap => {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SessionRequest[];
        setRequests(rows);
      },
      err => console.log('BookingRequests listener error:', err)
    );

    return () => unsub();
  }, [coachId]);

  type Slot = { start: string; end: string; isBooked: boolean };

  const markAvailabilitySlotBooked = async (req: SessionRequest) => {
    const availDocId = `${req.coachId}_${req.date}`;
    const ref = doc(db, 'coachAvailability', availDocId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data: any = snap.data();
    const slots: Slot[] = Array.isArray(data?.slots) ? data.slots : [];

    const toMinutes = (hhmm: string) => {
      const [h, m] = String(hhmm || '').split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return -1;
      return h * 60 + m;
    };

    const reqStartM = toMinutes(req.slotStart);
    const reqEndM = toMinutes(req.slotEnd);
    if (reqStartM < 0 || reqEndM <= reqStartM) return;

    let didSplit = false;
    const updated: Slot[] = [];

    for (const s of slots) {
      const sStartM = toMinutes(s.start);
      const sEndM = toMinutes(s.end);
      if (!s.isBooked && sStartM >= 0 && sEndM >= 0 && sStartM <= reqStartM && sEndM >= reqEndM) {
        didSplit = true;
        if (sStartM < reqStartM) {
          updated.push({ ...s, end: req.slotStart, isBooked: false });
        }
        updated.push({ ...s, start: req.slotStart, end: req.slotEnd, isBooked: true });
        if (reqEndM < sEndM) {
          updated.push({ ...s, start: req.slotEnd, end: s.end, isBooked: false });
        }
      } else {
        updated.push(s);
      }
    }

    if (!didSplit) return;

    await updateDoc(ref, {
      slots: updated,
      updatedAtMs: Date.now(),
    });
  };

  const acceptRequest = async (req: SessionRequest) => {
    try {
      const now = new Date();

      // 1) create session so dashboards update
      await setDoc(
        doc(db, 'sessions', req.id),
        {
          playerId: req.playerId,
          playerName: req.playerName,
          coachId: req.coachId,
          coachName: req.coachName || coachName,

          date: req.date,
          start: req.slotStart,
          end: req.slotEnd,

          status: 'upcoming',

          createdAtMs: Date.now(),
          createdAtLabel: now.toLocaleString(),
          requestId: req.id,
        },
        { merge: true }
      );

      // 2) mark request accepted
      await updateDoc(doc(db, 'sessionRequests', req.id), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      });

      // 3) book the slot so other players can’t request it
      await markAvailabilitySlotBooked(req);

      Alert.alert('Accepted', 'Session booked and slot blocked.');
    } catch (e: any) {
      console.log('Accept failed:', e);
      Alert.alert('Failed', e?.message || 'Could not accept.');
    }
  };

  const declineRequest = async (reqId: string) => {
    try {
      await updateDoc(doc(db, 'sessionRequests', reqId), {
        status: 'declined',
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      });
      Alert.alert('Declined', 'Request declined.');
    } catch (e: any) {
      console.log('Decline failed:', e);
      Alert.alert('Failed', e?.message || 'Could not decline.');
    }
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topRightLogoContainer}>
            <Image source={toplineLogo} style={styles.topRightLogo} />
          </View>

          <View style={styles.coachBookingHeroCard}>
            <View style={styles.coachBookingHeroRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.coachBookingHeroTitle}>Booking Requests</Text>
                <Text style={styles.coachBookingHeroSub}>
                  Review the latest session requests and confirm availability.
                </Text>
              </View>
            </View>

            <View style={styles.coachBookingStatsRow}>
              <View style={styles.coachBookingStatPill}>
                <Text style={styles.coachBookingStatValue}>{requests.length}</Text>
                <Text style={styles.coachBookingStatLabel}>Pending</Text>
              </View>
            </View>
          </View>

          <View style={styles.dashboardSectionWrap}>
            <View style={styles.dashboardSectionHeader}>
              <View style={styles.dashboardSectionHeaderLeft}>
                <View style={styles.dashboardSectionIconWrap}>
                  <Text style={styles.dashboardSectionIcon}>📥</Text>
                </View>
                <Text style={styles.dashboardSectionTitle}>Pending Requests</Text>
              </View>
            </View>
            <View style={styles.dashboardSectionDivider} />

            <View style={styles.coachBookingCard}>
              {requests.length === 0 ? (
                <Text style={styles.coachBookingEmptyText}>No booking requests.</Text>
              ) : (
                requests.map(r => (
                  <View key={r.id} style={styles.coachBookingRequestItem}>
                    <View style={styles.coachBookingRequestHeaderRow}>
                      <Text style={styles.coachBookingRequestTitle}>
                        {r.playerName || 'Player'}
                      </Text>
                      <View style={styles.coachBookingBadge}>
                        <Text style={styles.coachBookingBadgeText}>Requested</Text>
                      </View>
                    </View>
                    <Text style={styles.coachBookingRequestMeta}>
                      {formatRequestDate(r.date)} • {r.slotStart} – {r.slotEnd}
                    </Text>

                    <TouchableOpacity style={[styles.primaryButton, { marginTop: 10 }]} onPress={() => acceptRequest(r)}>
                      <Text style={styles.primaryButtonText}>Accept</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.secondaryButton, { marginTop: 8 }]} onPress={() => declineRequest(r.id)}>
                      <Text style={styles.secondaryButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>⬅ Return to Coach Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
