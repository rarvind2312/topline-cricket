// src/screens/CoachAvailabilityScreen.body.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import type { RootStackParamList } from '../types';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { styles } from '../styles/styles';
import { formatDayDate } from '../utils/dateFormatter';
import { toplineLogo } from '../constants/assets';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachAvailability'>;

type Slot = { start: string; end: string; isBooked: boolean };

const pad2 = (n: number) => String(n).padStart(2, '0');
const toHHMM = (mins: number) => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;

function isWeekend(d: Date) {
  const day = d.getDay(); // 0=Sun ... 6=Sat
  return day === 0 || day === 6;
}

function buildStartTimes(d: Date, stepMins = 30) {
  const start = 9 * 60;
  const end = isWeekend(d) ? 13 * 60 : 18 * 60; // last end boundary
  const starts: string[] = [];
  for (let t = start; t <= end - stepMins; t += stepMins) {
    starts.push(toHHMM(t));
  }
  return starts;
}

function addMinutes(hhmm: string, minsToAdd: number) {
  const [h, m] = hhmm.split(':').map(x => parseInt(x, 10));
  const total = h * 60 + m + minsToAdd;
  return toHHMM(total);
}

function withinRange(date: Date, startHHMM: string, durationMins: number) {
  const start = 9 * 60;
  const end = isWeekend(date) ? 13 * 60 : 18 * 60;
  const [h, m] = startHHMM.split(':').map(x => parseInt(x, 10));
  const st = h * 60 + m;
  const en = st + durationMins;
  return st >= start && en <= end;
}

function overlaps(a: Slot, b: Slot) {
  const toMins = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const aS = toMins(a.start), aE = toMins(a.end);
  const bS = toMins(b.start), bE = toMins(b.end);
  return aS < bE && bS < aE;
}

export default function CoachAvailabilityScreenBody({ navigation }: Props) {
  const { firebaseUser, profile } = useAuth();
  const coachId = firebaseUser?.uid || '';

  const coachName = useMemo(() => {
    const fn = (profile as any)?.firstName || '';
    const ln = (profile as any)?.lastName || '';
    return `${fn} ${ln}`.trim() || (profile as any)?.email || 'Coach';
  }, [profile]);

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [slots, setSlots] = useState<Slot[]>([]);

  // Picker state
  const startTimes = useMemo(() => buildStartTimes(date, 30), [date]);
  const [selectedStart, setSelectedStart] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(60); // mins

  // ✅ local YYYY-MM-DD
  const dateKey = useMemo(() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [date]);

  const docId = `${coachId}_${dateKey}`;

  // ✅ Hide booked from available list (accepted requests mark slots as isBooked=true)
  const visibleSlots = useMemo(() => slots.filter(s => !s.isBooked), [slots]);
  const bookedSlots = useMemo(() => slots.filter(s => s.isBooked), [slots]);

  // Load existing availability for this date
  useEffect(() => {
    if (!coachId) return;

    const ref = doc(db, 'coachAvailability', docId);
    const unsub = onSnapshot(
      ref,
      snap => {
        const data: any = snap.exists() ? snap.data() : null;
        setSlots(Array.isArray(data?.slots) ? data.slots : []);
      },
      err => {
        console.log('Availability listener error:', err);
        Alert.alert('Failed', (err as any)?.message || 'Missing permissions');
      }
    );

    return () => unsub();
  }, [coachId, docId]);

  // reset selected start if date changes
  useEffect(() => {
    setSelectedStart(startTimes[0] || '09:00');
  }, [startTimes]);

  const addSlot = () => {
    if (!withinRange(date, selectedStart, duration)) {
      Alert.alert('Invalid time', 'Selected slot is outside allowed time range.');
      return;
    }

    const newSlot: Slot = {
      start: selectedStart,
      end: addMinutes(selectedStart, duration),
      isBooked: false,
    };

    // prevent overlap with existing slots (includes booked too)
    if (slots.some(s => overlaps(s, newSlot))) {
      Alert.alert('Overlaps', 'This time overlaps with an existing slot.');
      return;
    }

    setSlots(prev => [...prev, newSlot].sort((a, b) => (a.start > b.start ? 1 : -1)));
  };

  // ✅ remove by matching start/end (safe even when using filtered lists)
  const removeSlotByTime = (start: string, end: string) => {
    setSlots(prev => prev.filter(s => !(s.start === start && s.end === end)));
  };

  const saveAvailability = async () => {
    if (!coachId) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    try {
      await setDoc(
        doc(db, 'coachAvailability', docId),
        {
          coachId,
          coachName,
          date: dateKey,
          dayLabel: date.toDateString(),
          slots,
          updatedAtMs: Date.now(),
        },
        { merge: true }
      );

      Alert.alert('Saved', 'Availability updated.');
    } catch (e: any) {
      console.log('Save availability failed:', e);
      Alert.alert('Failed', e?.message || 'Missing or insufficient permissions.');
    }
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.topRightLogoContainer}>
          <Image source={toplineLogo} style={styles.topRightLogo} />
        </View>

        <View style={styles.coachAvailabilityHeroCard}>
          <View style={styles.coachAvailabilityHeroRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.coachAvailabilityHeroTitle}>Availability</Text>
              <Text style={styles.coachAvailabilityHeroSub}>
                Set your open hours, add slots, and keep your schedule tidy.
              </Text>
            </View>
          </View>

          <View style={styles.coachAvailabilityStatsRow}>
            <View style={[styles.coachAvailabilityStatPill, { marginRight: 8 }]}>
              <Text style={styles.coachAvailabilityStatValue}>{visibleSlots.length}</Text>
              <Text style={styles.coachAvailabilityStatLabel}>Available</Text>
            </View>
            <View style={[styles.coachAvailabilityStatPill, { marginRight: 8 }]}>
              <Text style={styles.coachAvailabilityStatValue}>{bookedSlots.length}</Text>
              <Text style={styles.coachAvailabilityStatLabel}>Booked</Text>
            </View>
            <View style={styles.coachAvailabilityStatPill}>
              <Text style={styles.coachAvailabilityStatValue}>{slots.length}</Text>
              <Text style={styles.coachAvailabilityStatLabel}>Total</Text>
            </View>
          </View>
        </View>

        <Text style={styles.coachAvailabilitySectionTitle}>Select Date</Text>
        <View style={styles.coachAvailabilityCard}>
          <View style={styles.coachAvailabilityCardHeaderRow}>
            
            
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, styles.coachAvailabilityDateBtn]}
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

          <Text style={styles.coachAvailabilityInfoText}>
            {isWeekend(date) ? 'Weekend: 9:00 AM – 1:00 PM' : 'Weekday: 9:00 AM – 6:00 PM'}
          </Text>
        </View>

        <Text style={styles.coachAvailabilitySectionTitle}>Create Slot</Text>
        <View style={styles.coachAvailabilityCard}>
          <View style={styles.coachAvailabilityCardHeaderRow}>

          </View>

          <Text style={styles.inputLabel}>Start time</Text>
          <View style={styles.pickerCard}>
            <Picker selectedValue={selectedStart} onValueChange={v => setSelectedStart(String(v))}>
              {startTimes.map(t => (
                <Picker.Item key={t} label={t} value={t} />
              ))}
            </Picker>
          </View>

          <Text style={[styles.inputLabel, { marginTop: 12 }]}>Duration</Text>
          <View style={styles.pickerCard}>
            <Picker selectedValue={duration} onValueChange={v => setDuration(Number(v))}>
              <Picker.Item label="30 mins" value={30} />
              <Picker.Item label="60 mins" value={60} />
              <Picker.Item label="90 mins" value={90} />
              <Picker.Item label="120 mins" value={120} />
            </Picker>
          </View>

          <TouchableOpacity style={[styles.secondaryButton, { marginTop: 12 }]} onPress={addSlot}>
            <Text style={styles.secondaryButtonText}>+ Add Slot</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.coachAvailabilitySectionTitle}>Available Slots</Text>
        <View style={styles.coachAvailabilityCard}>
          <View style={styles.coachAvailabilityCardHeaderRow}>
            <Text style={styles.coachAvailabilityCardTitle}>Slots</Text>
            <View style={styles.coachAvailabilityBadge}>
              <Text style={styles.coachAvailabilityBadgeText}>{visibleSlots.length} available</Text>
            </View>
          </View>

          {visibleSlots.length === 0 ? (
            <Text style={styles.coachAvailabilityEmptyText}>No available slots for this date.</Text>
          ) : (
            visibleSlots.map((s, i) => (
              <View key={`${s.start}-${s.end}-${i}`} style={styles.coachAvailabilitySlotItem}>
                <View style={styles.coachAvailabilitySlotHeaderRow}>
                  <Text style={styles.coachAvailabilitySlotTime}>
                    {s.start} – {s.end}
                  </Text>
                  <View style={styles.coachAvailabilitySlotBadge}>
                    <Text style={styles.coachAvailabilitySlotBadgeText}>Available</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 10 }]}
                  onPress={() => removeSlotByTime(s.start, s.end)}
                >
                  <Text style={styles.secondaryButtonText}>Remove Slot</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {bookedSlots.length > 0 ? (
          <>
            <Text style={styles.coachAvailabilitySectionTitle}>Booked</Text>
            <View style={styles.coachAvailabilityCard}>
              <View style={styles.coachAvailabilityCardHeaderRow}>
                <Text style={styles.coachAvailabilityCardTitle}>Booked Slots</Text>
                <View style={[styles.coachAvailabilityBadge, styles.coachAvailabilityBadgeBooked]}>
                  <Text style={[styles.coachAvailabilityBadgeText, styles.coachAvailabilityBadgeBookedText]}>
                    {bookedSlots.length} booked
                  </Text>
                </View>
              </View>
              {bookedSlots.map((s, i) => (
                <View key={`booked-${s.start}-${s.end}-${i}`} style={[styles.coachAvailabilitySlotItem, styles.coachAvailabilitySlotItemBooked]}>
                  <View style={styles.coachAvailabilitySlotHeaderRow}>
                    <Text style={styles.coachAvailabilitySlotTime}>
                      {s.start} – {s.end}
                    </Text>
                    <View style={[styles.coachAvailabilitySlotBadge, styles.coachAvailabilitySlotBadgeBooked]}>
                      <Text style={[styles.coachAvailabilitySlotBadgeText, styles.coachAvailabilitySlotBadgeBookedText]}>
                        Booked
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <TouchableOpacity style={[styles.primaryButton, { marginTop: 14 }]} onPress={saveAvailability}>
          <Text style={styles.primaryButtonText}>Save Availability</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>⬅ Return to Coach Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
