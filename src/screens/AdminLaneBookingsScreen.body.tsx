import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import type { LaneType, RootStackParamList } from '../types';
import { db } from '../firebase';
import { styles } from '../styles/styles';
import { toplineLogo } from '../constants/assets';
import { useAuth } from '../context/AuthContext';
import { formatDayDate } from '../utils/dateFormatter';
import { normalizeLaneType, isSlotAvailable, TimeBlock } from '../utils/laneBooking';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLaneBookings'>;

type Lane = {
  id: string;
  laneName: string;
  laneType?: LaneType;
  isActive: boolean;
  sortOrder?: number;
};

type LaneBooking = {
  id: string;
  laneId: string;
  laneName?: string;
  laneType?: LaneType;
  date: string;
  start: string;
  end: string;
  bookingType?: 'training' | 'coaching';
  playerName?: string;
  coachName?: string;
  status?: string;
  sessionId?: string;
};

type LaneAvailabilityDoc = { laneId: string; blocks?: TimeBlock[]; date?: string };

export default function AdminLaneBookingsScreenBody({ navigation }: Props) {
  const { firebaseUser, isAdmin } = useAuth();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [lanes, setLanes] = useState<Lane[]>([]);
  const [bookings, setBookings] = useState<LaneBooking[]>([]);
  const [laneBlocks, setLaneBlocks] = useState<Record<string, TimeBlock[]>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLaneId, setEditingLaneId] = useState<string>('');

  const dateKey = useMemo(() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [date]);

  useEffect(() => {
    const q = query(collection(db, 'lanes'), orderBy('sortOrder', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Lane[];
        setLanes(rows);
      },
      () => setLanes([])
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'laneBookings'), where('date', '==', dateKey));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LaneBooking[];
        setBookings(rows.filter((b) => b.status !== 'cancelled'));
      },
      () => setBookings([])
    );
    return () => unsub();
  }, [dateKey]);

  useEffect(() => {
    const q = query(collection(db, 'laneAvailability'), where('date', '==', dateKey));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<string, TimeBlock[]> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as LaneAvailabilityDoc;
          if (data?.laneId) {
            map[data.laneId] = Array.isArray(data.blocks) ? data.blocks : [];
          }
        });
        setLaneBlocks(map);
      },
      () => setLaneBlocks({})
    );
    return () => unsub();
  }, [dateKey]);

  const activeLanes = useMemo(
    () => lanes.filter((l) => l.isActive !== false),
    [lanes]
  );

  const startEdit = (b: LaneBooking) => {
    setEditingId(b.id);
    setEditingLaneId(b.laneId || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingLaneId('');
  };

  const isLaneFree = (booking: LaneBooking, laneId: string) => {
    const blocks = laneBlocks[laneId] || [];
    const otherBookings = bookings.filter(
      (b) => b.id !== booking.id && b.laneId === laneId
    );
    const bookingBlocks = otherBookings.map((b) => ({ start: b.start, end: b.end }));
    const allBlocks = [...blocks, ...bookingBlocks];
    return isSlotAvailable('00:00', '23:59', allBlocks, booking.start, booking.end);
  };

  const saveEdit = async (booking: LaneBooking) => {
    if (!firebaseUser?.uid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!editingLaneId) {
      Alert.alert('Select lane', 'Please choose a lane.');
      return;
    }

    const lane = lanes.find((l) => l.id === editingLaneId);
    if (!lane) {
      Alert.alert('Invalid lane', 'Selected lane not found.');
      return;
    }

    if (!isLaneFree(booking, editingLaneId)) {
      Alert.alert('Unavailable', 'That lane is already blocked or booked for this time.');
      return;
    }

    try {
      await updateDoc(doc(db, 'laneBookings', booking.id), {
        laneId: editingLaneId,
        laneName: lane.laneName,
        laneType: normalizeLaneType(lane.laneType),
        updatedAtMs: Date.now(),
        updatedBy: firebaseUser.uid,
      });
      cancelEdit();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Missing permissions.');
    }
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <ScrollView contentContainerStyle={styles.formScroll}>
          <View style={styles.topRightLogoContainer}>
            <Image source={toplineLogo} style={styles.topRightLogo} />
          </View>
          <View style={styles.toplineSectionCard}>
            <Text style={styles.emptyTitle}>Access denied</Text>
            <Text style={styles.emptyBody}>You do not have admin access.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <View style={styles.topRightLogoContainer}>
          <Image source={toplineLogo} style={styles.topRightLogo} />
        </View>

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>📘</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Lane Bookings</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 6 }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.secondaryButtonText}>📅 {formatDayDate(date)}</Text>
            </TouchableOpacity>
            {showDatePicker ? (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event: DateTimePickerEvent, selected?: Date) => {
                  setShowDatePicker(false);
                  if (selected) setDate(selected);
                }}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>🛣️</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Bookings</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            {bookings.length === 0 ? (
              <Text style={styles.emptyBody}>No bookings for this date.</Text>
            ) : (
              bookings
                .sort((a, b) => (a.start > b.start ? 1 : -1))
                .map((b) => (
                  <View key={b.id} style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>
                      {b.laneName || 'Lane'} • {b.start} – {b.end}
                    </Text>
                    <Text style={styles.playerWelcomeSubText}>
                      {b.bookingType === 'coaching' ? 'Coaching' : 'Training'} •{' '}
                      {b.playerName || 'Player'}
                      {b.coachName ? ` / ${b.coachName}` : ''}
                    </Text>

                    {editingId === b.id ? (
                      <>
                        <Text style={[styles.inputLabel, { marginTop: 8 }]}>Change lane</Text>
                        <View style={styles.pickerCard}>
                          <Picker
                            selectedValue={editingLaneId}
                            onValueChange={(v) => setEditingLaneId(String(v))}
                          >
                            <Picker.Item label="Select lane" value="" />
                            {activeLanes.map((l) => (
                              <Picker.Item
                                key={l.id}
                                label={`${l.laneName} (${normalizeLaneType(l.laneType) === 'long' ? 'Long' : 'Short'})`}
                                value={l.id}
                              />
                            ))}
                          </Picker>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                          <TouchableOpacity
                            style={[styles.primaryButton, { flex: 1 }]}
                            onPress={() => saveEdit(b)}
                          >
                            <Text style={styles.primaryButtonText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.secondaryButton, { flex: 1 }]}
                            onPress={cancelEdit}
                          >
                            <Text style={styles.secondaryButtonText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.secondaryButton, { marginTop: 8 }]}
                        onPress={() => startEdit(b)}
                      >
                        <Text style={styles.secondaryButtonText}>Change Lane</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>⬅ Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
