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
} from 'react-native';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  getDoc,
} from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { styles } from '../styles/styles';
import type { RootStackParamList } from '../types';
import { formatDayDate } from '../utils/dateFormatter';

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

  status: 'requested' | 'accepted' | 'declined' | 'countered';

  createdAtMs?: number;
  createdAtLabel?: string;
  updatedAtMs?: number;
  updatedAtLabel?: string;
};

type Slot = { start: string; end: string; isBooked: boolean };

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

  // ✅ helper: convert "YYYY-MM-DD" -> Date (local)
  const parseYYYYMMDD = (s: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  // ✅ consistent label: "Tue, 03-Feb-2026" (fallback to raw string)
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

  const markAvailabilitySlotBooked = async (req: SessionRequest) => {
    // Availability doc: coachId_date
    const availDocId = `${req.coachId}_${req.date}`;
    const ref = doc(db, 'coachAvailability', availDocId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data: any = snap.data();
    const slots: Slot[] = Array.isArray(data?.slots) ? data.slots : [];

    const updated = slots.map(s => {
      const match = s.start === req.slotStart && s.end === req.slotEnd;
      return match ? { ...s, isBooked: true } : s;
    });

    await updateDoc(ref, {
      slots: updated,
      updatedAtMs: Date.now(),
    });
  };

  const acceptRequest = async (req: SessionRequest) => {
    try {
      const now = new Date();

      // 1) create session -> shows in Player Dashboard Upcoming
      await addDoc(collection(db, 'sessions'), {
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
      });

      // 2) mark request accepted
      await updateDoc(doc(db, 'sessionRequests', req.id), {
        status: 'accepted',
        updatedAtMs: Date.now(),
        updatedAtLabel: now.toLocaleString(),
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
      const now = new Date();
      await updateDoc(doc(db, 'sessionRequests', reqId), {
        status: 'declined',
        updatedAtMs: Date.now(),
        updatedAtLabel: now.toLocaleString(),
      });
      Alert.alert('Declined', 'Request declined.');
    } catch (e: any) {
      console.log('Decline failed:', e);
      Alert.alert('Failed', e?.message || 'Could not decline.');
    }
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Booking Requests</Text>

          <View style={[styles.toplineSectionCard, { marginTop: 10 }]}>
            {requests.length === 0 ? (
              <Text style={styles.emptyBody}>No booking requests.</Text>
            ) : (
              requests.map(r => (
                <View key={r.id} style={{ marginTop: 12 }}>
                  <Text style={styles.inputLabel}>
                    {r.playerName || 'Player'} • {formatRequestDate(r.date)}
                  </Text>

                  <Text style={styles.playerWelcomeSubText}>
                    Requested: {r.slotStart} – {r.slotEnd}
                  </Text>

                  <TouchableOpacity
                    style={[styles.primaryButton, { marginTop: 10 }]}
                    onPress={() => acceptRequest(r)}
                  >
                    <Text style={styles.primaryButtonText}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryButton, { marginTop: 8 }]}
                    onPress={() => declineRequest(r.id)}
                  >
                    <Text style={styles.secondaryButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* ✅ Back button ONCE, not inside each request */}
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