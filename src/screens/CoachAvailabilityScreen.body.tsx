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
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';

import type { RootStackParamList } from '../types';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { styles } from '../styles/styles';
import TimePickerModal from '../components/TimePickerModal';
import { formatDayDate } from '../utils/dateFormatter';
import { toplineLogo } from '../constants/assets';
import {
  DEFAULT_WEEK,
  OpeningOverride,
  OpeningPeriod,
  WeekHours,
  getDayHoursForDate,
} from '../utils/openingHours';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachAvailability'>;

type Slot = { start: string; end: string; isBooked: boolean };

const pad2 = (n: number) => String(n).padStart(2, '0');
const toHHMM = (mins: number) => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
};

function buildStartTimes(openM: number, closeM: number, durationMins: number, stepMins = 30) {
  const starts: string[] = [];
  const latestStart = closeM - durationMins;
  if (latestStart < openM) return starts;
  for (let t = openM; t <= latestStart; t += stepMins) {
    starts.push(toHHMM(t));
  }
  return starts;
}

function addMinutes(hhmm: string, minsToAdd: number) {
  const [h, m] = hhmm.split(':').map(x => parseInt(x, 10));
  const total = h * 60 + m + minsToAdd;
  return toHHMM(total);
}

function withinRange(openM: number, closeM: number, startHHMM: string, durationMins: number) {
  const st = toMinutes(startHHMM);
  const en = st + durationMins;
  return st >= openM && en <= closeM;
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
  const [defaultWeek, setDefaultWeek] = useState<WeekHours>(DEFAULT_WEEK);
  const [periods, setPeriods] = useState<OpeningPeriod[]>([]);
  const [override, setOverride] = useState<OpeningOverride | null>(null);

  // Picker state
  const [duration, setDuration] = useState<number>(60); // mins
  const [timePicker, setTimePicker] = useState<{ visible: boolean; value: Date }>({
    visible: false,
    value: new Date(),
  });

  const dayHours = getDayHoursForDate({
    date,
    dateKey,
    defaultWeek,
    periods,
    override,
  });
  const openM = toMinutes(dayHours.open);
  const closeM = toMinutes(dayHours.close);
  const allowedCloseM = closeM >= 0 ? closeM - 60 : -1;
  const isClosed = !!dayHours.isClosed;

  const startTimes = useMemo(() => {
    if (isClosed || openM < 0 || allowedCloseM < 0) return [];
    return buildStartTimes(openM, allowedCloseM, duration, 30);
  }, [openM, allowedCloseM, duration, isClosed]);

  const [selectedStart, setSelectedStart] = useState<string>(dayHours.open || '06:00');

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

  // Load opening hours (default week)
  useEffect(() => {
    const ref = doc(db, 'openingHours', 'defaultWeek');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data: any = snap.exists() ? snap.data() : null;
        const next = (data?.week || DEFAULT_WEEK) as WeekHours;
        setDefaultWeek({ ...DEFAULT_WEEK, ...next });
      },
      () => setDefaultWeek(DEFAULT_WEEK)
    );
    return () => unsub();
  }, []);

  // Load seasonal periods
  useEffect(() => {
    const q = query(collection(db, 'openingHoursPeriods'), orderBy('startDate', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OpeningPeriod[];
        setPeriods(rows);
      },
      () => setPeriods([])
    );
    return () => unsub();
  }, []);

  // Load override for selected date
  useEffect(() => {
    const ref = doc(db, 'openingHoursOverrides', dateKey);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data: any = snap.exists() ? snap.data() : null;
        setOverride(data ? ({ id: snap.id, ...(data as any) } as OpeningOverride) : null);
      },
      () => setOverride(null)
    );
    return () => unsub();
  }, [dateKey]);

  // reset selected start if date changes
  useEffect(() => {
    setSelectedStart(startTimes[0] || dayHours.open || '06:00');
  }, [startTimes]);

  const roundToStep = (d: Date, step = 30) => {
    const mins = d.getMinutes();
    const snapped = Math.round(mins / step) * step;
    const next = new Date(d);
    next.setMinutes(snapped);
    next.setSeconds(0);
    next.setMilliseconds(0);
    return next;
  };

  const findNearestOption = (target: string, options: string[]) => {
    if (!options.length) return '';
    const t = toMinutes(target);
    let best = options[0];
    let bestDiff = Number.POSITIVE_INFINITY;
    options.forEach((opt) => {
      const diff = Math.abs(toMinutes(opt) - t);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = opt;
      }
    });
    return best;
  };

  const openTimePicker = () => {
    if (startTimes.length === 0) {
      Alert.alert('No availability', 'No start times available for this duration.');
      return;
    }
    const base = selectedStart || startTimes[0];
    const [h, m] = base.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    setTimePicker({ visible: true, value: d });
  };

  const closeTimePicker = () => {
    setTimePicker((prev) => ({ ...prev, visible: false }));
  };

  const applyPickedTime = (picked: Date) => {
    if (startTimes.length === 0) {
      return;
    }
    const snapped = roundToStep(picked, 30);
    const hhmm = toHHMM(snapped.getHours() * 60 + snapped.getMinutes());
    if (startTimes.includes(hhmm)) {
      setSelectedStart(hhmm);
      return;
    }
    const nearest = findNearestOption(hhmm, startTimes);
    if (nearest) {
      setSelectedStart(nearest);
      Alert.alert('Adjusted', `Adjusted to nearest available time: ${nearest}`);
    }
  };

  const onTimePicked = (event: DateTimePickerEvent, selected?: Date) => {
    setTimePicker((prev) => {
      if (!selected) {
        return { ...prev, visible: Platform.OS !== 'ios' ? false : prev.visible };
      }
      const snapped = roundToStep(selected, 30);
      if (Platform.OS === 'ios') {
        return { ...prev, value: snapped };
      }
      applyPickedTime(snapped);
      return { ...prev, value: snapped, visible: false };
    });
  };

  const confirmTimePicker = () => {
    applyPickedTime(timePicker.value);
    closeTimePicker();
  };

  const addSlot = () => {
    if (isClosed) {
      Alert.alert('Closed', 'Opening hours are closed for this day.');
      return;
    }

    if (startTimes.length === 0) {
      Alert.alert('No slots', 'No available time slots for the selected duration.');
      return;
    }

    if (!withinRange(openM, allowedCloseM, selectedStart, duration)) {
      Alert.alert('Invalid time', 'Selected slot is outside the allowed window.');
      if (startTimes[0]) setSelectedStart(startTimes[0]);
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

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>📅</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Select Date</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.coachAvailabilityCard}>
            <View style={styles.coachAvailabilityCardHeaderRow} />

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
              {isClosed
                ? 'Closed: no availability for this day.'
                : `Allowed window: ${dayHours.open} – ${toHHMM(Math.max(openM, allowedCloseM))}`}
            </Text>
          </View>
        </View>

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>⏱️</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Create Slot</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.coachAvailabilityCard}>
            <View style={styles.coachAvailabilityCardHeaderRow} />

            <Text style={styles.inputLabel}>Start time</Text>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { marginTop: 6, opacity: startTimes.length ? 1 : 0.6 },
              ]}
              onPress={openTimePicker}
              disabled={startTimes.length === 0}
            >
              <Text style={styles.secondaryButtonText}>
                ⏰ {selectedStart || 'Select start time'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Duration</Text>
            <View style={styles.pillRow}>
              {[30, 60, 90, 120].map((d) => {
                const active = duration === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.rolePill, active ? styles.rolePillActive : null]}
                    onPress={() => setDuration(d)}
                  >
                    <Text style={[styles.rolePillText, active ? styles.rolePillTextActive : null]}>
                      {d} mins
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.secondaryButton, { marginTop: 12 }]} onPress={addSlot}>
              <Text style={styles.secondaryButtonText}>+ Add Slot</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TimePickerModal
          visible={timePicker.visible}
          value={timePicker.value}
          onChange={onTimePicked}
          onCancel={closeTimePicker}
          onConfirm={confirmTimePicker}
        />

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>✅</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Available Slots</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

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
        </View>

        {bookedSlots.length > 0 ? (
          <View style={styles.dashboardSectionWrap}>
            <View style={styles.dashboardSectionHeader}>
              <View style={styles.dashboardSectionHeaderLeft}>
                <View style={styles.dashboardSectionIconWrap}>
                  <Text style={styles.dashboardSectionIcon}>📌</Text>
                </View>
                <Text style={styles.dashboardSectionTitle}>Booked</Text>
              </View>
            </View>
            <View style={styles.dashboardSectionDivider} />

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
          </View>
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
