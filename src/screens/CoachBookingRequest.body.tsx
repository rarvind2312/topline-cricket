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
  Modal,
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
  getDocs,
} from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';

import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { styles } from '../styles/styles';
import type { RootStackParamList } from '../types';
import { formatDayDate } from '../utils/dateFormatter';
import { toplineLogo } from '../constants/assets';
import { normalizeLaneType, isSlotAvailable, TimeBlock } from '../utils/laneBooking';

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

type Lane = { id: string; laneName: string; laneType?: 'short' | 'long'; isActive: boolean; sortOrder?: number };
type LaneBooking = { id: string; laneId: string; date: string; start: string; end: string; status?: string };
type LaneAvailabilityDoc = { laneId: string; blocks?: TimeBlock[]; date?: string };

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
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [laneModalOpen, setLaneModalOpen] = useState(false);
  const [laneModalReq, setLaneModalReq] = useState<SessionRequest | null>(null);
  const [laneTypeFilter, setLaneTypeFilter] = useState<'short' | 'long'>('short');
  const [selectedLaneId, setSelectedLaneId] = useState('');
  const [laneBlocks, setLaneBlocks] = useState<Record<string, TimeBlock[]>>({});
  const [laneBookings, setLaneBookings] = useState<LaneBooking[]>([]);


  const parseYYYYMMDD = (s: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const toDateTimeMs = (dateKey: string, hhmm: string): number => {
    const parts = String(dateKey || '').split('-').map(Number);
    const time = String(hhmm || '').split(':').map(Number);
    if (parts.length !== 3 || time.length !== 2) return 0;
    const [y, mo, d] = parts;
    const [h, mi] = time;
    if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return 0;
    const dt = new Date(y, mo - 1, d, h, mi, 0, 0);
    const ms = dt.getTime();
    return Number.isNaN(ms) ? 0 : ms;
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

  useEffect(() => {
    const q = query(collection(db, 'lanes'), orderBy('sortOrder', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Lane[];
        setLanes(rows.filter((l) => l.isActive !== false));
      },
      () => setLanes([])
    );
    return () => unsub();
  }, []);

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

  const loadLaneMetaForDate = async (dateKey: string) => {
    const [availSnap, bookingSnap] = await Promise.all([
      getDocs(query(collection(db, 'laneAvailability'), where('date', '==', dateKey))),
      getDocs(query(collection(db, 'laneBookings'), where('date', '==', dateKey))),
    ]);

    const map: Record<string, TimeBlock[]> = {};
    availSnap.docs.forEach((d) => {
      const data = d.data() as LaneAvailabilityDoc;
      if (data?.laneId) {
        map[data.laneId] = Array.isArray(data.blocks) ? data.blocks : [];
      }
    });
    setLaneBlocks(map);

    const bookings = bookingSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((b: any) => b.status !== 'cancelled') as LaneBooking[];
    setLaneBookings(bookings);
  };

  const checkLaneAvailable = async (laneId: string, req: SessionRequest) => {
    const [availSnap, bookingSnap] = await Promise.all([
      getDocs(query(collection(db, 'laneAvailability'), where('date', '==', req.date))),
      getDocs(query(collection(db, 'laneBookings'), where('date', '==', req.date))),
    ]);

    let blocks: TimeBlock[] = [];
    availSnap.docs.forEach((d) => {
      const data = d.data() as LaneAvailabilityDoc;
      if (data?.laneId === laneId) {
        blocks = Array.isArray(data.blocks) ? data.blocks : [];
      }
    });

    const bookings = bookingSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((b: any) => b.status !== 'cancelled' && b.laneId === laneId && b.id !== req.id)
      .map((b: any) => ({ start: b.start, end: b.end })) as TimeBlock[];

    return isSlotAvailable('00:00', '23:59', [...blocks, ...bookings], req.slotStart, req.slotEnd);
  };

  const openLaneModal = async (req: SessionRequest) => {
    setLaneModalReq(req);
    setLaneModalOpen(true);
    setLaneTypeFilter('short');
    setSelectedLaneId('');
    await loadLaneMetaForDate(req.date);
  };

  const closeLaneModal = () => {
    setLaneModalOpen(false);
    setLaneModalReq(null);
    setSelectedLaneId('');
  };

  const acceptWithoutLane = async () => {
    if (!laneModalReq) return;
    await acceptRequest(laneModalReq, null);
    closeLaneModal();
  };

  const acceptWithLane = async () => {
    if (!laneModalReq) return;
    if (!selectedLaneId) {
      Alert.alert('Select lane', 'Please choose a lane.');
      return;
    }
    const lane = lanes.find((l) => l.id === selectedLaneId);
    if (!lane) {
      Alert.alert('Invalid lane', 'Selected lane not found.');
      return;
    }
    const ok = await checkLaneAvailable(selectedLaneId, laneModalReq);
    if (!ok) {
      Alert.alert('Unavailable', 'That lane is already booked or blocked.');
      return;
    }
    await acceptRequest(laneModalReq, lane);
    closeLaneModal();
  };

  const isLaneFreeForReq = (laneId: string, req: SessionRequest) => {
    const blocks = laneBlocks[laneId] || [];
    const otherBookings = laneBookings.filter(
      (b) => b.laneId === laneId && b.id !== req.id
    );
    const bookingBlocks = otherBookings.map((b) => ({ start: b.start, end: b.end }));
    const allBlocks = [...blocks, ...bookingBlocks];
    return isSlotAvailable('00:00', '23:59', allBlocks, req.slotStart, req.slotEnd);
  };

  const filteredLanes = useMemo(() => {
    return lanes.filter((l) => normalizeLaneType(l.laneType) === laneTypeFilter);
  }, [lanes, laneTypeFilter]);

  const availableLanes = useMemo(() => {
    if (!laneModalReq) return [];
    return filteredLanes.filter((l) => isLaneFreeForReq(l.id, laneModalReq));
  }, [filteredLanes, laneModalReq, laneBlocks, laneBookings]);

  const acceptRequest = async (req: SessionRequest, lane?: Lane | null) => {
    try {
      const now = new Date();
      const startAtMs = toDateTimeMs(req.date, req.slotStart);
      const endAtMs = toDateTimeMs(req.date, req.slotEnd);

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

          ...(lane
            ? {
                laneId: lane.id,
                laneName: lane.laneName,
                laneType: normalizeLaneType(lane.laneType),
              }
            : {}),

          status: 'upcoming',
          startAtMs: startAtMs || null,
          endAtMs: endAtMs || null,

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

      // 4) create lane booking if provided
      if (lane) {
        await setDoc(
          doc(db, 'laneBookings', req.id),
          {
            bookingType: 'coaching',
            status: 'booked',
            laneId: lane.id,
            laneName: lane.laneName,
            laneType: normalizeLaneType(lane.laneType),
            date: req.date,
            start: req.slotStart,
            end: req.slotEnd,
            playerId: req.playerId,
            playerName: req.playerName,
            coachId: req.coachId,
            coachName: req.coachName || coachName,
            sessionId: req.id,
            createdAtMs: Date.now(),
            updatedAtMs: Date.now(),
            updatedBy: coachId,
          },
          { merge: true }
        );
      }

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

                    <TouchableOpacity
                      style={[styles.primaryButton, { marginTop: 10 }]}
                      onPress={() => openLaneModal(r)}
                    >
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

          <Modal visible={laneModalOpen} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                  Assign Lane (Optional)
                </Text>
                {laneModalReq ? (
                  <Text style={styles.playerWelcomeSubText}>
                    {laneModalReq.playerName || 'Player'} • {formatRequestDate(laneModalReq.date)} •{' '}
                    {laneModalReq.slotStart} – {laneModalReq.slotEnd}
                  </Text>
                ) : null}

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Lane type</Text>
                <View style={styles.pickerCard}>
                  <Picker
                    selectedValue={laneTypeFilter}
                    onValueChange={(v) => {
                      setLaneTypeFilter(String(v) as 'short' | 'long');
                      setSelectedLaneId('');
                    }}
                  >
                    <Picker.Item label="Short (bowling machine)" value="short" />
                    <Picker.Item label="Long" value="long" />
                  </Picker>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Available lanes</Text>
                <View style={styles.pickerCard}>
                  <Picker
                    selectedValue={selectedLaneId}
                    onValueChange={(v) => setSelectedLaneId(String(v))}
                  >
                    <Picker.Item label={availableLanes.length ? 'Select lane' : 'No lanes available'} value="" />
                    {availableLanes.map((l) => (
                      <Picker.Item key={l.id} label={l.laneName} value={l.id} />
                    ))}
                  </Picker>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={acceptWithoutLane}
                  >
                    <Text style={styles.secondaryButtonText}>Accept Only</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={acceptWithLane}
                  >
                    <Text style={styles.primaryButtonText}>Accept & Book Lane</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 10 }]}
                  onPress={closeLaneModal}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

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
