import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  limit,
} from 'firebase/firestore';

import type { RootStackParamList } from '../types';
import { db } from '../firebase';
import { styles } from '../styles/styles';
import { toplineLogo } from '../constants/assets';
import { useAuth } from '../context/AuthContext';
import Checkbox from '../components/Checkbox';
import {
  DAYS,
  DEFAULT_WEEK,
  DayHours,
  OpeningOverride,
  OpeningPeriod,
  WeekHours,
  dateKeyFromDate,
  mergeWeek,
} from '../utils/openingHours';
import { sendEmergencyClosureNotification } from '../services/admin';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminOpeningHours'>;

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

const toHHMM = (d: Date) => {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const dateFromHHMM = (hhmm: string) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  const dt = new Date();
  dt.setHours(Number.isNaN(h) ? 0 : h);
  dt.setMinutes(Number.isNaN(m) ? 0 : m);
  dt.setSeconds(0, 0);
  return dt;
};

const roundToStep = (d: Date, step = 30) => {
  const total = d.getHours() * 60 + d.getMinutes();
  const rounded = Math.round(total / step) * step;
  const next = new Date(d);
  next.setHours(Math.floor(rounded / 60));
  next.setMinutes(rounded % 60);
  next.setSeconds(0, 0);
  return next;
};

const parseDateKey = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const isValidWeek = (week: WeekHours) => {
  for (const d of DAYS) {
    const h = week[d.key];
    if (!h) continue;
    if (!h.isClosed) {
      const openM = toMinutes(h.open);
      const closeM = toMinutes(h.close);
      if (openM < 0 || closeM < 0 || openM >= closeM) {
        return { ok: false, label: d.label };
      }
    }
  }
  return { ok: true, label: '' };
};

export default function AdminOpeningHoursScreenBody({ navigation }: Props) {
  const { firebaseUser, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<'seasonal' | 'overrides' | 'emergency'>(
    'seasonal'
  );
  const [periods, setPeriods] = useState<OpeningPeriod[]>([]);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState('');
  const [periodStart, setPeriodStart] = useState<Date>(new Date());
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [showPeriodStartPicker, setShowPeriodStartPicker] = useState(false);
  const [showPeriodEndPicker, setShowPeriodEndPicker] = useState(false);
  const [periodWeek, setPeriodWeek] = useState<WeekHours>(DEFAULT_WEEK);
  const [weekdaysClosed, setWeekdaysClosed] = useState(false);
  const [weekdaysOpen, setWeekdaysOpen] = useState('06:00');
  const [weekdaysClose, setWeekdaysClose] = useState('21:00');
  const [satClosed, setSatClosed] = useState(false);
  const [satOpen, setSatOpen] = useState('06:00');
  const [satClose, setSatClose] = useState('21:00');
  const [sunClosed, setSunClosed] = useState(false);
  const [sunOpen, setSunOpen] = useState('06:00');
  const [sunClose, setSunClose] = useState('21:00');

  const [overrideStart, setOverrideStart] = useState<Date>(new Date());
  const [overrideEnd, setOverrideEnd] = useState<Date>(new Date());
  const [showOverrideStartPicker, setShowOverrideStartPicker] = useState(false);
  const [showOverrideEndPicker, setShowOverrideEndPicker] = useState(false);
  const [overrideClosed, setOverrideClosed] = useState(true);
  const [overrideOpen, setOverrideOpen] = useState('09:00');
  const [overrideClose, setOverrideClose] = useState('17:00');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrides, setOverrides] = useState<OpeningOverride[]>([]);

  const [noticeText, setNoticeText] = useState('');
  const [noticeSending, setNoticeSending] = useState(false);
  const [timePicker, setTimePicker] = useState<{
    visible: boolean;
    target: 'period' | 'override';
    field: 'open' | 'close';
    group?: 'weekdays' | 'sat' | 'sun';
    value: Date;
  }>({
    visible: false,
    target: 'period',
    field: 'open',
    value: new Date(),
  });

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
    const q = query(collection(db, 'openingHoursOverrides'), orderBy('date', 'desc'), limit(90));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OpeningOverride[];
        setOverrides(rows);
      },
      () => setOverrides([])
    );
    return () => unsub();
  }, []);

  const applyWeekdays = (patch: Partial<DayHours>) => {
    setPeriodWeek((prev) => ({
      ...prev,
      mon: { ...prev.mon, ...patch },
      tue: { ...prev.tue, ...patch },
      wed: { ...prev.wed, ...patch },
      thu: { ...prev.thu, ...patch },
      fri: { ...prev.fri, ...patch },
    }));
  };

  const applyWeekend = (day: 'sat' | 'sun', patch: Partial<DayHours>) => {
    setPeriodWeek((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const syncGroupFromWeek = (week: WeekHours) => {
    const w = mergeWeek(week);
    setWeekdaysOpen(w.mon.open);
    setWeekdaysClose(w.mon.close);
    setWeekdaysClosed(!!w.mon.isClosed);

    setSatOpen(w.sat.open);
    setSatClose(w.sat.close);
    setSatClosed(!!w.sat.isClosed);

    setSunOpen(w.sun.open);
    setSunClose(w.sun.close);
    setSunClosed(!!w.sun.isClosed);
  };

  const openTimePicker = (params: {
    target: 'period' | 'override';
    field: 'open' | 'close';
    group?: 'weekdays' | 'sat' | 'sun';
    value: string;
  }) => {
    setTimePicker({
      visible: true,
      target: params.target,
      field: params.field,
      group: params.group,
      value: dateFromHHMM(params.value),
    });
  };

  const closeTimePicker = () => {
    setTimePicker((prev) => ({ ...prev, visible: false }));
  };

  const applyTimeFromPicker = (picker: {
    target: 'period' | 'override';
    field: 'open' | 'close';
    group?: 'weekdays' | 'sat' | 'sun';
  }, hhmm: string) => {
    if (picker.target === 'period' && picker.group) {
      if (picker.group === 'weekdays') {
        setWeekdaysOpen(picker.field === 'open' ? hhmm : weekdaysOpen);
        setWeekdaysClose(picker.field === 'close' ? hhmm : weekdaysClose);
        applyWeekdays({ [picker.field]: hhmm } as any);
      }
      if (picker.group === 'sat') {
        setSatOpen(picker.field === 'open' ? hhmm : satOpen);
        setSatClose(picker.field === 'close' ? hhmm : satClose);
        applyWeekend('sat', { [picker.field]: hhmm } as any);
      }
      if (picker.group === 'sun') {
        setSunOpen(picker.field === 'open' ? hhmm : sunOpen);
        setSunClose(picker.field === 'close' ? hhmm : sunClose);
        applyWeekend('sun', { [picker.field]: hhmm } as any);
      }
    }
    if (picker.target === 'override') {
      if (picker.field === 'open') setOverrideOpen(hhmm);
      if (picker.field === 'close') setOverrideClose(hhmm);
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

      const hhmm = toHHMM(snapped);
      applyTimeFromPicker(prev, hhmm);
      return { ...prev, value: snapped, visible: false };
    });
  };

  const confirmTimePicker = () => {
    const snapped = roundToStep(timePicker.value, 30);
    const hhmm = toHHMM(snapped);
    applyTimeFromPicker(timePicker, hhmm);
    closeTimePicker();
  };

  const resetPeriodForm = () => {
    setEditingPeriodId(null);
    setPeriodLabel('');
    setPeriodWeek(DEFAULT_WEEK);
    syncGroupFromWeek(DEFAULT_WEEK);
    setPeriodStart(new Date());
    setPeriodEnd(new Date());
  };

  const savePeriod = async () => {
    if (!firebaseUser?.uid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    const startKey = dateKeyFromDate(periodStart);
    const endKey = dateKeyFromDate(periodEnd);
    if (startKey > endKey) {
      Alert.alert('Invalid dates', 'Start date must be before end date.');
      return;
    }

    const check = isValidWeek(periodWeek);
    if (!check.ok) {
      Alert.alert('Invalid hours', `Please check ${check.label} open/close times.`);
      return;
    }

    try {
      if (editingPeriodId) {
        await updateDoc(doc(db, 'openingHoursPeriods', editingPeriodId), {
          startDate: startKey,
          endDate: endKey,
          label: periodLabel.trim() || '',
          week: periodWeek,
          updatedAtMs: Date.now(),
          updatedBy: firebaseUser.uid,
        });
        Alert.alert('Updated', 'Seasonal hours updated.');
      } else {
        await addDoc(collection(db, 'openingHoursPeriods'), {
          startDate: startKey,
          endDate: endKey,
          label: periodLabel.trim() || '',
          week: periodWeek,
          createdAtMs: Date.now(),
          updatedAtMs: Date.now(),
          updatedBy: firebaseUser.uid,
        });
        Alert.alert('Saved', 'Seasonal hours created.');
      }
      resetPeriodForm();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Missing permissions.');
    }
  };

  const editPeriod = (p: OpeningPeriod) => {
    setEditingPeriodId(p.id);
    setPeriodLabel(p.label || '');
    const start = parseDateKey(p.startDate) || new Date();
    const end = parseDateKey(p.endDate) || new Date();
    setPeriodStart(start);
    setPeriodEnd(end);
    const merged = mergeWeek(p.week);
    setPeriodWeek(merged);
    syncGroupFromWeek(merged);
  };

  const deletePeriod = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'openingHoursPeriods', id));
      if (editingPeriodId === id) resetPeriodForm();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Missing permissions.');
    }
  };

  const saveOverrideRange = async () => {
    if (!firebaseUser?.uid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    const startKey = dateKeyFromDate(overrideStart);
    const endKey = dateKeyFromDate(overrideEnd);
    if (startKey > endKey) {
      Alert.alert('Invalid dates', 'Start date must be before end date.');
      return;
    }

    if (!overrideClosed) {
      const openM = toMinutes(overrideOpen);
      const closeM = toMinutes(overrideClose);
      if (openM < 0 || closeM < 0 || openM >= closeM) {
        Alert.alert('Invalid hours', 'Please check override open/close times.');
        return;
      }
    }

    try {
      const batch = writeBatch(db);
      const start = new Date(overrideStart);
      const end = new Date(overrideEnd);
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      let ops = 0;
      while (cursor <= endDate) {
        const dateKey = dateKeyFromDate(cursor);
        const ref = doc(db, 'openingHoursOverrides', dateKey);
        batch.set(
          ref,
          {
            date: dateKey,
            isClosed: overrideClosed,
            open: overrideClosed ? null : overrideOpen,
            close: overrideClosed ? null : overrideClose,
            reason: overrideReason.trim() || '',
            updatedAtMs: Date.now(),
            updatedBy: firebaseUser.uid,
          },
          { merge: true }
        );
        ops += 1;
        cursor.setDate(cursor.getDate() + 1);
      }
      if (ops > 0) await batch.commit();
      Alert.alert('Saved', 'Overrides updated.');
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Missing permissions.');
    }
  };

  const removeOverride = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'openingHoursOverrides', id));
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Missing permissions.');
    }
  };

  const sendEmergencyNotice = async () => {
    const msg = noticeText.trim();
    if (!msg) {
      Alert.alert('Message required', 'Please enter a notification message.');
      return;
    }
    try {
      setNoticeSending(true);
      const res = await sendEmergencyClosureNotification(msg);
      if (res?.ok) {
        setNoticeText('');
        Alert.alert('Sent', `Notification sent to ${res.sent || 0} users.`);
      } else {
        Alert.alert('Failed', 'Unable to send notification.');
      }
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Unable to send notification.');
    } finally {
      setNoticeSending(false);
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

        <View style={styles.toplineSectionCard}>
          <View style={styles.fitnessToggleWrap}>
            <TouchableOpacity
              style={[
                styles.fitnessToggleBtn,
                activeSection === 'seasonal' && styles.fitnessToggleBtnActive,
              ]}
              onPress={() => setActiveSection('seasonal')}
            >
              <Text
                style={[
                  styles.fitnessToggleText,
                  activeSection === 'seasonal' && styles.fitnessToggleTextActive,
                ]}
              >
                Seasonal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.fitnessToggleBtn,
                activeSection === 'overrides' && styles.fitnessToggleBtnActive,
              ]}
              onPress={() => setActiveSection('overrides')}
            >
              <Text
                style={[
                  styles.fitnessToggleText,
                  activeSection === 'overrides' && styles.fitnessToggleTextActive,
                ]}
              >
                Overrides
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.fitnessToggleBtn,
                activeSection === 'emergency' && styles.fitnessToggleBtnActive,
              ]}
              onPress={() => setActiveSection('emergency')}
            >
              <Text
                style={[
                  styles.fitnessToggleText,
                  activeSection === 'emergency' && styles.fitnessToggleTextActive,
                ]}
              >
                Emergency
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeSection === 'seasonal' ? (
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>🗓️</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Seasonal / Monthly Hours</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Label (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Summer hours"
              placeholderTextColor="#9ca3af"
              value={periodLabel}
              onChangeText={setPeriodLabel}
            />

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Start date</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 6 }]}
              onPress={() => setShowPeriodStartPicker(true)}
            >
              <Text style={styles.secondaryButtonText}>📅 {dateKeyFromDate(periodStart)}</Text>
            </TouchableOpacity>
            {showPeriodStartPicker ? (
              <DateTimePicker
                value={periodStart}
                mode="date"
                display="default"
                onChange={(event: DateTimePickerEvent, selected?: Date) => {
                  setShowPeriodStartPicker(false);
                  if (selected) setPeriodStart(selected);
                }}
              />
            ) : null}

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>End date</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 6 }]}
              onPress={() => setShowPeriodEndPicker(true)}
            >
              <Text style={styles.secondaryButtonText}>📅 {dateKeyFromDate(periodEnd)}</Text>
            </TouchableOpacity>
            {showPeriodEndPicker ? (
              <DateTimePicker
                value={periodEnd}
                mode="date"
                display="default"
                onChange={(event: DateTimePickerEvent, selected?: Date) => {
                  setShowPeriodEndPicker(false);
                  if (selected) setPeriodEnd(selected);
                }}
              />
            ) : null}

            <View style={{ marginTop: 14 }}>
              <Text style={styles.inputLabel}>Weekdays (Mon–Fri)</Text>
              <Checkbox
                label="Closed"
                checked={weekdaysClosed}
                onToggle={() => {
                  const next = !weekdaysClosed;
                  setWeekdaysClosed(next);
                  applyWeekdays({ isClosed: next });
                }}
              />
              <View style={{ opacity: weekdaysClosed ? 0.5 : 1 }}>
                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Open</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 6 }]}
                  disabled={weekdaysClosed}
                  onPress={() =>
                    openTimePicker({
                      target: 'period',
                      field: 'open',
                      group: 'weekdays',
                      value: weekdaysOpen,
                    })
                  }
                >
                  <Text style={styles.secondaryButtonText}>{weekdaysOpen}</Text>
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Close</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 6 }]}
                  disabled={weekdaysClosed}
                  onPress={() =>
                    openTimePicker({
                      target: 'period',
                      field: 'close',
                      group: 'weekdays',
                      value: weekdaysClose,
                    })
                  }
                >
                  <Text style={styles.secondaryButtonText}>{weekdaysClose}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={styles.inputLabel}>Saturday</Text>
              <Checkbox
                label="Closed"
                checked={satClosed}
                onToggle={() => {
                  const next = !satClosed;
                  setSatClosed(next);
                  applyWeekend('sat', { isClosed: next });
                }}
              />
              <View style={{ opacity: satClosed ? 0.5 : 1 }}>
                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Open</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 6 }]}
                  disabled={satClosed}
                  onPress={() =>
                    openTimePicker({
                      target: 'period',
                      field: 'open',
                      group: 'sat',
                      value: satOpen,
                    })
                  }
                >
                  <Text style={styles.secondaryButtonText}>{satOpen}</Text>
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Close</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 6 }]}
                  disabled={satClosed}
                  onPress={() =>
                    openTimePicker({
                      target: 'period',
                      field: 'close',
                      group: 'sat',
                      value: satClose,
                    })
                  }
                >
                  <Text style={styles.secondaryButtonText}>{satClose}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={styles.inputLabel}>Sunday</Text>
              <Checkbox
                label="Closed"
                checked={sunClosed}
                onToggle={() => {
                  const next = !sunClosed;
                  setSunClosed(next);
                  applyWeekend('sun', { isClosed: next });
                }}
              />
              <View style={{ opacity: sunClosed ? 0.5 : 1 }}>
                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Open</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 6 }]}
                  disabled={sunClosed}
                  onPress={() =>
                    openTimePicker({
                      target: 'period',
                      field: 'open',
                      group: 'sun',
                      value: sunOpen,
                    })
                  }
                >
                  <Text style={styles.secondaryButtonText}>{sunOpen}</Text>
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Close</Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 6 }]}
                  disabled={sunClosed}
                  onPress={() =>
                    openTimePicker({
                      target: 'period',
                      field: 'close',
                      group: 'sun',
                      value: sunClose,
                    })
                  }
                >
                  <Text style={styles.secondaryButtonText}>{sunClose}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 14 }]}
              onPress={savePeriod}
            >
              <Text style={styles.primaryButtonText}>
                {editingPeriodId ? 'Update Seasonal Hours' : 'Save Seasonal Hours'}
              </Text>
            </TouchableOpacity>

            {editingPeriodId ? (
              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 10 }]}
                onPress={resetPeriodForm}
              >
                <Text style={styles.secondaryButtonText}>Cancel Edit</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Existing seasonal periods</Text>
            {periods.length === 0 ? (
              <Text style={styles.emptyBody}>No seasonal hours configured.</Text>
            ) : (
              periods.map((p) => (
                <View key={p.id} style={{ marginTop: 10 }}>
                  <Text style={styles.playerWelcomeSubText}>
                    {p.startDate} → {p.endDate}{p.label ? ` • ${p.label}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[styles.secondaryButton, { flex: 1 }]}
                      onPress={() => editPeriod(p)}
                    >
                      <Text style={styles.secondaryButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryButton, { flex: 1 }]}
                      onPress={() => deletePeriod(p.id)}
                    >
                      <Text style={styles.secondaryButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        ) : null}

        {activeSection === 'overrides' ? (
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>🚫</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Overrides / Closures</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Start date</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 6 }]}
              onPress={() => setShowOverrideStartPicker(true)}
            >
              <Text style={styles.secondaryButtonText}>📅 {dateKeyFromDate(overrideStart)}</Text>
            </TouchableOpacity>
            {showOverrideStartPicker ? (
              <DateTimePicker
                value={overrideStart}
                mode="date"
                display="default"
                onChange={(event: DateTimePickerEvent, selected?: Date) => {
                  setShowOverrideStartPicker(false);
                  if (selected) setOverrideStart(selected);
                }}
              />
            ) : null}

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>End date</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 6 }]}
              onPress={() => setShowOverrideEndPicker(true)}
            >
              <Text style={styles.secondaryButtonText}>📅 {dateKeyFromDate(overrideEnd)}</Text>
            </TouchableOpacity>
            {showOverrideEndPicker ? (
              <DateTimePicker
                value={overrideEnd}
                mode="date"
                display="default"
                onChange={(event: DateTimePickerEvent, selected?: Date) => {
                  setShowOverrideEndPicker(false);
                  if (selected) setOverrideEnd(selected);
                }}
              />
            ) : null}

            <View style={{ marginTop: 12 }}>
              <Checkbox
                label="Closed"
                checked={overrideClosed}
                onToggle={() => setOverrideClosed(!overrideClosed)}
              />
            </View>

            <View style={{ opacity: overrideClosed ? 0.5 : 1 }}>
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Open</Text>
              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 6 }]}
                disabled={overrideClosed}
                onPress={() =>
                  openTimePicker({
                    target: 'override',
                    field: 'open',
                    value: overrideOpen,
                  })
                }
              >
                <Text style={styles.secondaryButtonText}>{overrideOpen}</Text>
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Close</Text>
              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 6 }]}
                disabled={overrideClosed}
                onPress={() =>
                  openTimePicker({
                    target: 'override',
                    field: 'close',
                    value: overrideClose,
                  })
                }
              >
                <Text style={styles.secondaryButtonText}>{overrideClose}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Reason (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Public holiday / maintenance"
              placeholderTextColor="#9ca3af"
              value={overrideReason}
              onChangeText={setOverrideReason}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 12 }]}
              onPress={saveOverrideRange}
            >
              <Text style={styles.primaryButtonText}>Save Overrides</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Upcoming overrides</Text>
            {overrides.length === 0 ? (
              <Text style={styles.emptyBody}>No overrides set.</Text>
            ) : (
              overrides.map((o) => (
                <View key={o.id} style={{ marginTop: 10 }}>
                  <Text style={styles.playerWelcomeSubText}>
                    {o.date} • {o.isClosed ? 'Closed' : `${o.open} – ${o.close}`}
                    {o.reason ? ` • ${o.reason}` : ''}
                  </Text>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { marginTop: 6 }]}
                    onPress={() => removeOverride(o.id)}
                  >
                    <Text style={styles.secondaryButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
        ) : null}

        {activeSection === 'emergency' ? (
        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>📣</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Emergency Closure Notice</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
              placeholder="We are closed today due to..."
              placeholderTextColor="#9ca3af"
              multiline
              value={noticeText}
              onChangeText={setNoticeText}
            />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { marginTop: 12 },
                noticeSending ? { opacity: 0.6 } : null,
              ]}
              onPress={sendEmergencyNotice}
              disabled={noticeSending}
            >
              <Text style={styles.primaryButtonText}>Send Notification</Text>
            </TouchableOpacity>
          </View>
        </View>
        ) : null}

        {timePicker.visible ? (
          Platform.OS === 'ios' ? (
            <Modal transparent animationType="fade">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 18 }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
                    Select time
                  </Text>
                  <DateTimePicker
                    value={timePicker.value}
                    mode="time"
                    display="spinner"
                    minuteInterval={30}
                    onChange={onTimePicked}
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity style={[styles.secondaryButton, { flex: 1, marginTop: 0 }]} onPress={closeTimePicker}>
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} onPress={confirmTimePicker}>
                      <Text style={styles.primaryButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={timePicker.value}
              mode="time"
              display="default"
              minuteInterval={30}
              onChange={onTimePicked}
            />
          )
        ) : null}

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
