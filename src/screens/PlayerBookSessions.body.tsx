// src/screens/PlayerBookSessionsScreen.body.tsx
// ✅ ONLY CHANGE: Date format consistency -> "Tue, 03-Feb-2026"
// (No other logic/UI changes)

import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { onSnapshot, orderBy } from 'firebase/firestore';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { fetchCoaches } from "../utils/publicUsers";
import type { RootStackParamList } from '../types';
import { styles } from '../styles/styles';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { formatDayDate } from '../utils/dateFormatter';

const TOPLINE_LOGO = require('../../assets/topline-cricket-image.jpg');

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerBookSessions'>;

type CoachLite = { uid: string; name: string };

type Slot = { start: string; end: string; isBooked: boolean };
type SlotOption = { start: string; end: string };

const DURATION_OPTIONS = [30, 60, 90, 120];
const STEP_MINS = 30;

const toMinutes = (hhmm: string): number => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
};

const toHHMM = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const mergeWindows = (items: Slot[]): SlotOption[] => {
  const sorted = [...items].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const out: SlotOption[] = [];
  for (const s of sorted) {
    const sStart = toMinutes(s.start);
    const sEnd = toMinutes(s.end);
    if (sStart < 0 || sEnd < 0 || sEnd <= sStart) continue;
    if (out.length === 0) {
      out.push({ start: s.start, end: s.end });
      continue;
    }
    const last = out[out.length - 1];
    const lastEnd = toMinutes(last.end);
    if (sStart <= lastEnd) {
      const nextEnd = Math.max(lastEnd, sEnd);
      last.end = toHHMM(nextEnd);
    } else {
      out.push({ start: s.start, end: s.end });
    }
  }
  return out;
};

const toLocalDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function PlayerBookSessionScreenBody({ navigation }: Props) {
  const { firebaseUser, user } = useAuth();
  const playerId = firebaseUser?.uid || '';

  const playerName = useMemo(() => {
    const fn = (user as any)?.firstName || '';
    const ln = (user as any)?.lastName || '';
    return `${fn} ${ln}`.trim() || (user as any)?.email || 'Player';
  }, [user]);

  const [pending, setPending] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<CoachLite[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');

  const selectedCoachName = useMemo(() => {
    return coaches.find(c => c.uid === selectedCoachId)?.name || '';
  }, [coaches, selectedCoachId]);

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateKey = useMemo(() => toLocalDateKey(date), [date]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedWindowIndex, setSelectedWindowIndex] = useState<number>(-1);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');

 // Load coaches list
useEffect(() => {
  const loadCoaches = async () => {
    try {
      setLoadingCoaches(true);

      const list = await fetchCoaches(200);

      // PlayerBookingScreen expects { uid, name }
      const mapped: CoachLite[] = list.map((c) => ({
        uid: c.id,
        name: c.name,
      }));

      setCoaches(mapped);
    } catch (e) {
      console.log("Load coaches error:", e);
    } finally {
      setLoadingCoaches(false);
    }
  };

  loadCoaches();
}, []);

  useEffect(() => {
    if (!playerId || !selectedCoachId) return;

    const qReq = query(
      collection(db, 'sessionRequests'),
      where('playerId', '==', playerId),
      where('coachId', '==', selectedCoachId),
      orderBy('createdAtMs', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(
      qReq,
      snap => setPending(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))),
      err => console.log('pending requests listener error', err)
    );

    return () => unsub();
  }, [playerId, selectedCoachId]);

  // Load availability for selected coach + date
  const loadAvailability = async () => {
    if (!selectedCoachId) {
      setSlots([]);
      setSelectedWindowIndex(-1);
      setSelectedStartTime('');
      return;
    }
    try {
      setLoadingSlots(true);
      setSelectedWindowIndex(-1);
      setSelectedStartTime('');

      const availDocId = `${selectedCoachId}_${dateKey}`;
      const ref = doc(db, 'coachAvailability', availDocId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setSlots([]);
        return;
      }

      const data: any = snap.data();
      const list: Slot[] = Array.isArray(data?.slots) ? data.slots : [];
      // show only not booked
      setSlots(list.filter(s => !s.isBooked));
    } catch (e: any) {
      console.log('Load availability failed:', e);
      Alert.alert('Failed', e?.message || 'Could not load availability.');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoachId, dateKey]);

  const windows: SlotOption[] = useMemo(() => mergeWindows(slots), [slots]);

  const startOptions: string[] = useMemo(() => {
    const duration = Number(selectedDuration || 0);
    if (!duration) return [];
    const w = windows[selectedWindowIndex];
    if (!w) return [];
    const opts: string[] = [];
    const startM = toMinutes(w.start);
    const endM = toMinutes(w.end);
    if (startM < 0 || endM < 0 || endM <= startM) return [];
    for (let t = startM; t + duration <= endM; t += STEP_MINS) {
      opts.push(toHHMM(t));
    }
    return opts;
  }, [windows, selectedWindowIndex, selectedDuration]);

  useEffect(() => {
    setSelectedStartTime('');
  }, [selectedDuration, selectedWindowIndex, selectedCoachId, dateKey]);

  const requestBooking = async () => {
    if (!playerId) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!selectedCoachId) {
      Alert.alert('Select coach', 'Please select a coach first.');
      return;
    }
    if (!selectedStartTime) {
      Alert.alert('Select start time', 'Please choose a start time.');
      return;
    }

    const slot = {
      start: selectedStartTime,
      end: toHHMM(toMinutes(selectedStartTime) + Number(selectedDuration || 0)),
    };
    const now = new Date();

    try {
      // Re-validate slot against latest availability (prevents outdated/shorter requests)
      const availDocId = `${selectedCoachId}_${dateKey}`;
      const ref = doc(db, 'coachAvailability', availDocId);
      const snap = await getDoc(ref);
      const data: any = snap.exists() ? snap.data() : null;
      const list: Slot[] = Array.isArray(data?.slots) ? data.slots : [];
      const reqStart = toMinutes(slot.start);
      const reqEnd = toMinutes(slot.end);
      const match = list.find((s) => {
        if (s.isBooked) return false;
        const sStart = toMinutes(s.start);
        const sEnd = toMinutes(s.end);
        return sStart >= 0 && sEnd >= 0 && sStart <= reqStart && sEnd >= reqEnd;
      });
      if (!match) {
        Alert.alert('Slot unavailable', 'This slot was updated. Please select a new time.');
        loadAvailability();
        return;
      }

      await addDoc(collection(db, 'sessionRequests'), {
        playerId,
        playerName,
        coachId: selectedCoachId,
        coachName: selectedCoachName,

        date: dateKey,
        slotStart: slot.start,
        slotEnd: slot.end,

        status: 'requested',

        createdAtMs: Date.now(),
        createdAtLabel: now.toLocaleString(),
        updatedAtMs: Date.now(),
        updatedAtLabel: now.toLocaleString(),
      });

      Alert.alert('Requested', `Sent booking request to ${selectedCoachName}.`);
      navigation.goBack();
    } catch (e: any) {
      console.log('Request booking failed:', e);
      Alert.alert('Failed', e?.message || 'Missing or insufficient permissions.');
    }
  };

  const canRequest = selectedCoachId && startOptions.length > 0 && !!selectedStartTime;

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topRightLogoContainer}>
            <Image source={TOPLINE_LOGO} style={styles.topRightLogo} />
          </View>

          <View style={styles.dashboardSectionWrap}>
            <View style={styles.dashboardSectionHeader}>
              <View style={styles.dashboardSectionHeaderLeft}>
                <View style={styles.dashboardSectionIconWrap}>
                  <Text style={styles.dashboardSectionIcon}>📅</Text>
                </View>
                <Text style={styles.dashboardSectionTitle}>Book a Session</Text>
              </View>
            </View>
            <View style={styles.dashboardSectionDivider} />

            <Text style={styles.inputLabel}>Select coach</Text>
            <View style={styles.playerPickerCard}>
              <Picker
                enabled={!loadingCoaches}
                selectedValue={selectedCoachId}
                onValueChange={v => setSelectedCoachId(String(v))}
              >
                <Picker.Item label={loadingCoaches ? 'Loading coaches…' : 'Coach'} value="" />
                {coaches.map(c => (
                  <Picker.Item key={c.uid} label={c.name} value={c.uid} />
                ))}
              </Picker>
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 14, opacity: selectedCoachId ? 1 : 0.6 }]}
              onPress={() => setShowDatePicker(true)}
              disabled={!selectedCoachId}
            >
              {/* ✅ CHANGED */}
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

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>⏱️</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Available times</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Duration</Text>
            <View style={styles.pickerCard}>
              <Picker selectedValue={selectedDuration} onValueChange={(v) => setSelectedDuration(Number(v))}>
                {DURATION_OPTIONS.map((d) => (
                  <Picker.Item key={d} label={`${d} mins`} value={d} />
                ))}
              </Picker>
            </View>
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Available windows</Text>
            {loadingSlots ? (
              <Text style={styles.emptyBody}>Loading…</Text>
            ) : windows.length === 0 ? (
              <Text style={styles.emptyBody}>No availability found for this date.</Text>
            ) : (
              windows.map((w, idx) => {
                const selected = idx === selectedWindowIndex;
                return (
                  <TouchableOpacity
                    key={`${w.start}-${w.end}-${idx}`}
                    style={[
                      styles.secondaryButton,
                      { marginTop: 10, borderWidth: selected ? 2 : 1 },
                    ]}
                    onPress={() => setSelectedWindowIndex(idx)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {selected ? '✅ ' : ''}{w.start} – {w.end}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}

            {selectedWindowIndex >= 0 ? (
              <>
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Start time</Text>
                <View style={styles.pickerCard}>
                  <Picker
                    selectedValue={selectedStartTime}
                    onValueChange={(v) => setSelectedStartTime(String(v))}
                  >
                    <Picker.Item label="Select start time" value="" />
                    {startOptions.map((t) => (
                      <Picker.Item key={t} label={t} value={t} />
                    ))}
                  </Picker>
                </View>

                {selectedStartTime ? (
                  <Text style={[styles.playerWelcomeSubText, { marginTop: 8 }]}>
                    Selected: {selectedStartTime} – {toHHMM(toMinutes(selectedStartTime) + Number(selectedDuration || 0))}
                  </Text>
                ) : null}
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 14, opacity: canRequest ? 1 : 0.6 }]}
              onPress={requestBooking}
              disabled={!canRequest}
            >
              <Text style={styles.primaryButtonText}>Request Booking</Text>
            </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>⬅ Back To DashBoard</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
