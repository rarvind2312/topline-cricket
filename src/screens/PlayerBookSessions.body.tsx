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

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerBookSessions'>;

type CoachLite = { uid: string; name: string };

type Slot = { start: string; end: string; isBooked: boolean };

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

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(-1);

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
      return;
    }
    try {
      setLoadingSlots(true);
      setSelectedSlotIndex(-1);

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

  const requestBooking = async () => {
    if (!playerId) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!selectedCoachId) {
      Alert.alert('Select coach', 'Please select a coach first.');
      return;
    }
    if (selectedSlotIndex < 0 || selectedSlotIndex >= slots.length) {
      Alert.alert('Select slot', 'Please select an available time slot.');
      return;
    }

    const slot = slots[selectedSlotIndex];
    const now = new Date();

    try {
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

  const canRequest = selectedCoachId && slots.length > 0 && selectedSlotIndex >= 0;

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Book a Session</Text>

          <Text style={styles.inputLabel}>Select coach</Text>
          <View style={styles.pickerCard}>
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

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Available slots</Text>
          <View style={[styles.toplineSectionCard, { marginTop: 10 }]}>
            {loadingSlots ? (
              <Text style={styles.emptyBody}>Loading…</Text>
            ) : slots.length === 0 ? (
              <Text style={styles.emptyBody}>No availability found for this date.</Text>
            ) : (
              slots.map((s, idx) => {
                const selected = idx === selectedSlotIndex;
                return (
                  <TouchableOpacity
                    key={`${s.start}-${s.end}-${idx}`}
                    style={[
                      styles.secondaryButton,
                      { marginTop: 10, borderWidth: selected ? 2 : 1 },
                    ]}
                    onPress={() => setSelectedSlotIndex(idx)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {selected ? '✅ ' : ''}{s.start} – {s.end}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 14, opacity: canRequest ? 1 : 0.6 }]}
              onPress={requestBooking}
              disabled={!canRequest}
            >
              <Text style={styles.primaryButtonText}>Request Booking</Text>
            </TouchableOpacity>
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