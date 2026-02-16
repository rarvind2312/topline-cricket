import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { collection, doc, onSnapshot, query, orderBy, setDoc } from 'firebase/firestore';

import type { RootStackParamList } from '../types';
import { db } from '../firebase';
import { styles } from '../styles/styles';
import TimePickerModal from '../components/TimePickerModal';
import { toplineLogo } from '../constants/assets';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_WEEK,
  OpeningOverride,
  OpeningPeriod,
  WeekHours,
  getDayHoursForDate,
} from '../utils/openingHours';
import { computeWindows } from '../utils/laneBooking';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLaneAvailability'>;

type Lane = { id: string; laneName: string; isActive: boolean; sortOrder?: number };
type Block = { start: string; end: string; reason?: string };

const buildTimeOptions = (stepMins = 30) => {
  const items: string[] = [];
  for (let t = 0; t <= 23 * 60 + 30; t += stepMins) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    items.push(`${h}:${m}`);
  }
  return items;
};

const timeOptions = buildTimeOptions(30);

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

export default function AdminLaneAvailabilityScreenBody({ navigation }: Props) {
  const { firebaseUser, isAdmin } = useAuth();
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [selectedLaneId, setSelectedLaneId] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [defaultWeek, setDefaultWeek] = useState<WeekHours>(DEFAULT_WEEK);
  const [periods, setPeriods] = useState<OpeningPeriod[]>([]);
  const [override, setOverride] = useState<OpeningOverride | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [lastSavedMs, setLastSavedMs] = useState<number | null>(null);
  const [blockStart, setBlockStart] = useState('10:00');
  const [blockEnd, setBlockEnd] = useState('11:00');
  const [timePicker, setTimePicker] = useState<{ visible: boolean; target: 'start' | 'end'; value: Date }>({
    visible: false,
    target: 'start',
    value: new Date(),
  });

  const dateKey = useMemo(() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [date]);

  useEffect(() => {
    const q = query(collection(db, 'lanes'), orderBy('sortOrder', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Lane[];
      setLanes(list);
      if (!selectedLaneId && list.length > 0) {
        setSelectedLaneId(list[0].id);
      }
    });
    return () => unsub();
  }, [selectedLaneId]);

  useEffect(() => {
    const ref = doc(db, 'openingHours', 'defaultWeek');
    const unsub = onSnapshot(ref, (snap) => {
      const data: any = snap.exists() ? snap.data() : null;
      const next = (data?.week || DEFAULT_WEEK) as WeekHours;
      setDefaultWeek({ ...DEFAULT_WEEK, ...next });
    });
    return () => unsub();
  }, []);

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

  useEffect(() => {
    if (!selectedLaneId) {
      setBlocks([]);
      return;
    }
    const id = `${dateKey}_${selectedLaneId}`;
    const ref = doc(db, 'laneAvailability', id);
    const unsub = onSnapshot(ref, (snap) => {
      const data: any = snap.exists() ? snap.data() : null;
      setBlocks(Array.isArray(data?.blocks) ? data.blocks : []);
      setLastSavedMs(typeof data?.updatedAtMs === 'number' ? data.updatedAtMs : null);
    });
    return () => unsub();
  }, [dateKey, selectedLaneId]);

  const hours = getDayHoursForDate({
    date,
    dateKey,
    defaultWeek,
    periods,
    override,
  });
  const isClosed = hours.isClosed;
  const availableWindows = useMemo(() => {
    if (isClosed) return [];
    return computeWindows(hours.open, hours.close, blocks);
  }, [hours.open, hours.close, isClosed, blocks]);

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

  const openTimePicker = (target: 'start' | 'end') => {
    const base = target === 'start' ? blockStart : blockEnd;
    const [h, m] = base.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    setTimePicker({ visible: true, target, value: d });
  };

  const closeTimePicker = () => {
    setTimePicker((prev) => ({ ...prev, visible: false }));
  };

  const applyPickedTime = (picked: Date, target: 'start' | 'end') => {
    const snapped = roundToStep(picked, 30);
    const hhmm = `${String(snapped.getHours()).padStart(2, '0')}:${String(snapped.getMinutes()).padStart(2, '0')}`;
    if (timeOptions.includes(hhmm)) {
      target === 'start' ? setBlockStart(hhmm) : setBlockEnd(hhmm);
      return;
    }
    const nearest = findNearestOption(hhmm, timeOptions);
    if (nearest) {
      target === 'start' ? setBlockStart(nearest) : setBlockEnd(nearest);
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
      applyPickedTime(snapped, prev.target);
      return { ...prev, value: snapped, visible: false };
    });
  };

  const confirmTimePicker = () => {
    applyPickedTime(timePicker.value, timePicker.target);
    closeTimePicker();
  };

  const addBlock = () => {
    const s = toMinutes(blockStart);
    const e = toMinutes(blockEnd);
    const openM = toMinutes(hours.open);
    const closeM = toMinutes(hours.close);

    if (isClosed) {
      Alert.alert('Closed', 'This day is marked as closed.');
      return;
    }
    if (s < 0 || e < 0 || s >= e) {
      Alert.alert('Invalid', 'Please check start and end times.');
      return;
    }
    if (s < openM || e > closeM) {
      Alert.alert('Outside hours', 'Block must be within opening hours.');
      return;
    }

    setBlocks((prev) => [...prev, { start: blockStart, end: blockEnd }]);
  };

  const removeBlock = (idx: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAvailability = async () => {
    if (!firebaseUser?.uid) return;
    if (!selectedLaneId) {
      Alert.alert('Select lane', 'Please choose a lane.');
      return;
    }
    try {
      const id = `${dateKey}_${selectedLaneId}`;
      await setDoc(
        doc(db, 'laneAvailability', id),
        {
          date: dateKey,
          laneId: selectedLaneId,
          open: hours.open,
          close: hours.close,
          blocks,
          updatedAtMs: Date.now(),
          updatedBy: firebaseUser.uid,
        },
        { merge: true }
      );
      Alert.alert('Saved', 'Lane availability updated.');
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
                <Text style={styles.dashboardSectionIcon}>🛣️</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Lane Availability</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 6 }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.secondaryButtonText}>📅 {dateKey}</Text>
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

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Lane</Text>
            <View style={styles.pickerCard}>
              <Picker selectedValue={selectedLaneId} onValueChange={(v) => setSelectedLaneId(String(v))}>
                {lanes.map((l) => (
                  <Picker.Item key={l.id} label={l.laneName} value={l.id} />
                ))}
              </Picker>
            </View>

            <Text style={[styles.playerWelcomeSubText, { marginTop: 10 }]}>
              {isClosed ? 'Closed for this day' : `Opening hours: ${hours.open} – ${hours.close}`}
            </Text>

            {!isClosed ? (
              <>
                <Text style={[styles.playerWelcomeSubText, { marginTop: 6 }]}>
                  Blocked windows: {blocks.length}
                </Text>
                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Available windows</Text>
                {availableWindows.length === 0 ? (
                  <Text style={styles.emptyBody}>No availability after blocks.</Text>
                ) : (
                  availableWindows.map((w, idx) => (
                    <Text key={`${w.start}-${w.end}-${idx}`} style={styles.playerWelcomeSubText}>
                      {w.start} – {w.end}
                    </Text>
                  ))
                )}
              </>
            ) : null}

            {lastSavedMs ? (
              <Text style={[styles.playerWelcomeSubText, { marginTop: 8 }]}>
                Last saved: {new Date(lastSavedMs).toLocaleString()}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>⛔</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Block Lane Times</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Block start</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 6 }]}
              onPress={() => openTimePicker('start')}
            >
              <Text style={styles.secondaryButtonText}>⏰ {blockStart}</Text>
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Block end</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 6 }]}
              onPress={() => openTimePicker('end')}
            >
              <Text style={styles.secondaryButtonText}>⏰ {blockEnd}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryButton, { marginTop: 12 }]} onPress={addBlock}>
              <Text style={styles.secondaryButtonText}>+ Add Block</Text>
            </TouchableOpacity>

            {blocks.length === 0 ? (
              <Text style={[styles.emptyBody, { marginTop: 10 }]}>
                No blocked times for this date.
              </Text>
            ) : (
              blocks.map((b, idx) => (
                <View key={`${b.start}-${b.end}-${idx}`} style={{ marginTop: 10 }}>
                  <Text style={styles.playerWelcomeSubText}>
                    {b.start} – {b.end}
                  </Text>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { marginTop: 6 }]}
                    onPress={() => removeBlock(idx)}
                  >
                    <Text style={styles.secondaryButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        <TimePickerModal
          visible={timePicker.visible}
          value={timePicker.value}
          onChange={onTimePicked}
          onCancel={closeTimePicker}
          onConfirm={confirmTimePicker}
        />

        <TouchableOpacity style={[styles.primaryButton, { marginTop: 14 }]} onPress={saveAvailability}>
          <Text style={styles.primaryButtonText}>Save Availability</Text>
        </TouchableOpacity>

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
