import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import type { LaneType, RootStackParamList } from '../types';
import { styles } from '../styles/styles';
import TimePickerModal from '../components/TimePickerModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { formatDayDate } from '../utils/dateFormatter';
import {
  DEFAULT_WEEK,
  OpeningOverride,
  OpeningPeriod,
  WeekHours,
  getDayHoursForDate,
} from '../utils/openingHours';
import {
  computeWindows,
  isSlotAvailable,
  normalizeLaneType,
  toHHMM,
  toMinutes,
  TimeBlock,
} from '../utils/laneBooking';
import { fetchPlayersAndParents, PublicUserLite } from '../utils/publicUsers';

const TOPLINE_LOGO = require('../../assets/topline-cricket-image.jpg');

type Props = NativeStackScreenProps<RootStackParamList, 'CoachBookLanes'>;

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
  date: string;
  start: string;
  end: string;
  status?: string;
};

const DURATION_OPTIONS = [30, 60, 90, 120];
const STEP_MINS = 30;

export default function CoachBookLanesScreenBody({ navigation }: Props) {
  const { firebaseUser, profile } = useAuth();
  const coachId = firebaseUser?.uid || '';

  const coachName = useMemo(() => {
    const fn = (profile as any)?.firstName || '';
    const ln = (profile as any)?.lastName || '';
    return `${fn} ${ln}`.trim() || (profile as any)?.email || 'Coach';
  }, [profile]);

  const [players, setPlayers] = useState<PublicUserLite[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [playerNameInput, setPlayerNameInput] = useState<string>('');

  const [lanes, setLanes] = useState<Lane[]>([]);
  const [laneType, setLaneType] = useState<'all' | LaneType>('all');
  const [useSpecificLane, setUseSpecificLane] = useState(false);
  const [selectedLaneId, setSelectedLaneId] = useState<string>('');
  const [laneBlocksById, setLaneBlocksById] = useState<Record<string, TimeBlock[]>>({});
  const [laneBookingsById, setLaneBookingsById] = useState<Record<string, TimeBlock[]>>({});

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateKey = useMemo(() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [date]);

  const [defaultWeek, setDefaultWeek] = useState<WeekHours>(DEFAULT_WEEK);
  const [periods, setPeriods] = useState<OpeningPeriod[]>([]);
  const [override, setOverride] = useState<OpeningOverride | null>(null);

  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [timePicker, setTimePicker] = useState<{ visible: boolean; value: Date }>({
    visible: false,
    value: new Date(),
  });

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
    let active = true;
    fetchPlayersAndParents(120)
      .then((list) => {
        if (!active) return;
        const onlyPlayers = list.filter((p) => p.role === 'player');
        setPlayers(onlyPlayers);
      })
      .catch(() => setPlayers([]));
    return () => {
      active = false;
    };
  }, []);

  const activeLanes = useMemo(
    () => lanes.filter((l) => l.isActive !== false),
    [lanes]
  );

  const filteredLanes = useMemo(() => {
    if (laneType === 'all') return activeLanes;
    return activeLanes.filter((l) => normalizeLaneType(l.laneType) === laneType);
  }, [activeLanes, laneType]);

  useEffect(() => {
    if (!useSpecificLane) return;
    if (!selectedLaneId && filteredLanes.length > 0) {
      setSelectedLaneId(filteredLanes[0].id);
      return;
    }
    if (selectedLaneId && !filteredLanes.find((l) => l.id === selectedLaneId)) {
      setSelectedLaneId(filteredLanes[0]?.id || '');
    }
  }, [useSpecificLane, filteredLanes, selectedLaneId]);

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerId(id);
    const picked = players.find((p) => p.id === id);
    if (picked?.name) {
      setPlayerNameInput(picked.name);
    } else if (!id) {
      setPlayerNameInput('');
    }
  };

  const handlePlayerNameChange = (text: string) => {
    setPlayerNameInput(text);
    if (selectedPlayerId) setSelectedPlayerId('');
  };

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

  // Load lane blocks for date (all lanes)
  useEffect(() => {
    const q = query(collection(db, 'laneAvailability'), where('date', '==', dateKey));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<string, TimeBlock[]> = {};
        snap.docs.forEach((d) => {
          const data: any = d.data();
          if (data?.laneId) {
            map[data.laneId] = Array.isArray(data.blocks) ? data.blocks : [];
          }
        });
        setLaneBlocksById(map);
      },
      () => setLaneBlocksById({})
    );
    return () => unsub();
  }, [dateKey]);

  // Load bookings for date (all lanes)
  useEffect(() => {
    const q = query(collection(db, 'laneBookings'), where('date', '==', dateKey));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<string, TimeBlock[]> = {};
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((b: any) => b.status !== 'cancelled')
          .forEach((b: any) => {
            if (!b.laneId) return;
            if (!map[b.laneId]) map[b.laneId] = [];
            map[b.laneId].push({ start: b.start, end: b.end });
          });
        setLaneBookingsById(map);
      },
      () => setLaneBookingsById({})
    );
    return () => unsub();
  }, [dateKey]);

  const dayHours = getDayHoursForDate({
    date,
    dateKey,
    defaultWeek,
    periods,
    override,
  });

  const lanesForAvailability = useMemo(() => {
    if (useSpecificLane && selectedLaneId) {
      return filteredLanes.filter((l) => l.id === selectedLaneId);
    }
    return filteredLanes;
  }, [useSpecificLane, selectedLaneId, filteredLanes]);

  const availableStartOptions: string[] = useMemo(() => {
    const duration = Number(selectedDuration || 0);
    if (!duration) return [];
    if (dayHours.isClosed) return [];
    const opts = new Set<string>();
    lanesForAvailability.forEach((lane) => {
      const blocks = [
        ...(laneBlocksById[lane.id] || []),
        ...(laneBookingsById[lane.id] || []),
      ];
      const windows = computeWindows(dayHours.open, dayHours.close, blocks);
      windows.forEach((w) => {
        const startM = toMinutes(w.start);
        const endM = toMinutes(w.end);
        if (startM < 0 || endM < 0 || endM <= startM) return;
        for (let t = startM; t + duration <= endM; t += STEP_MINS) {
          opts.add(toHHMM(t));
        }
      });
    });
    return Array.from(opts).sort((a, b) => toMinutes(a) - toMinutes(b));
  }, [lanesForAvailability, laneBlocksById, laneBookingsById, dayHours, selectedDuration]);

  const suggestedLane = useMemo(() => {
    if (!selectedStartTime) return null;
    const duration = Number(selectedDuration || 0);
    if (!duration) return null;
    const slotEnd = toHHMM(toMinutes(selectedStartTime) + duration);
    for (const lane of lanesForAvailability) {
      const blocks = [
        ...(laneBlocksById[lane.id] || []),
        ...(laneBookingsById[lane.id] || []),
      ];
      const ok = isSlotAvailable(dayHours.open, dayHours.close, blocks, selectedStartTime, slotEnd);
      if (ok) return lane;
    }
    return null;
  }, [lanesForAvailability, laneBlocksById, laneBookingsById, dayHours, selectedStartTime, selectedDuration]);

  useEffect(() => {
    if (!selectedStartTime) return;
    if (availableStartOptions.length === 0) {
      setSelectedStartTime('');
      return;
    }
    if (!availableStartOptions.includes(selectedStartTime)) {
      setSelectedStartTime('');
    }
  }, [availableStartOptions, selectedStartTime]);

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
    if (availableStartOptions.length === 0) {
      Alert.alert('No availability', 'No start times available for this date and duration.');
      return;
    }
    const base = selectedStartTime || availableStartOptions[0];
    const [h, m] = base.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    setTimePicker({ visible: true, value: d });
  };

  const closeTimePicker = () => {
    setTimePicker((prev) => ({ ...prev, visible: false }));
  };

  const applyPickedTime = (picked: Date) => {
    if (availableStartOptions.length === 0) {
      setSelectedStartTime('');
      return;
    }
    const snapped = roundToStep(picked, 30);
    const hhmm = toHHMM(snapped.getHours() * 60 + snapped.getMinutes());
    if (availableStartOptions.includes(hhmm)) {
      setSelectedStartTime(hhmm);
      return;
    }
    const nearest = findNearestOption(hhmm, availableStartOptions);
    if (nearest) {
      setSelectedStartTime(nearest);
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

  const requestBooking = async () => {
    if (!coachId) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    const finalPlayerName = playerNameInput.trim();
    if (!finalPlayerName) {
      Alert.alert('Enter player', 'Please enter a player name or pick from the list.');
      return;
    }
    if (!selectedStartTime) {
      Alert.alert('Select start time', 'Please choose a start time.');
      return;
    }

    const duration = Number(selectedDuration || 0);
    const slotEnd = toHHMM(toMinutes(selectedStartTime) + duration);

    if (dayHours.isClosed) {
      Alert.alert('Closed', 'This day is closed.');
      return;
    }

    const lane = suggestedLane;
    if (!lane) {
      Alert.alert('Unavailable', 'No lane available for that time. Please select another time.');
      return;
    }

    // Re-validate against latest blocks + bookings
    const id = `${dateKey}_${lane.id}`;
    const laneSnap = await getDoc(doc(db, 'laneAvailability', id));
    const laneData: any = laneSnap.exists() ? laneSnap.data() : null;
    const latestBlocks: TimeBlock[] = Array.isArray(laneData?.blocks) ? laneData.blocks : [];

    const latestBookingsQ = query(
      collection(db, 'laneBookings'),
      where('laneId', '==', lane.id),
      where('date', '==', dateKey)
    );
    const bookingSnap = await getDocs(latestBookingsQ);
    const bookingDocs = bookingSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((b: any) => b.status !== 'cancelled') as LaneBooking[];

    const latestBookingBlocks = bookingDocs.map((b) => ({ start: b.start, end: b.end }));
    const latestAllBlocks = [...latestBlocks, ...latestBookingBlocks];

    const ok = isSlotAvailable(
      dayHours.open,
      dayHours.close,
      latestAllBlocks,
      selectedStartTime,
      slotEnd
    );
    if (!ok) {
      Alert.alert('Unavailable', 'That time was just booked. Please choose another slot.');
      return;
    }
    const laneName = lane.laneName || 'Lane';
    const laneTypeValue = normalizeLaneType(lane.laneType);

    try {
      const payload: any = {
        bookingType: 'coaching',
        status: 'booked',
        laneId: lane.id,
        laneName,
        laneType: laneTypeValue,
        date: dateKey,
        start: selectedStartTime,
        end: slotEnd,
        playerName: finalPlayerName,
        coachId,
        coachName,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
        updatedBy: coachId,
      };
      if (selectedPlayerId) payload.playerId = selectedPlayerId;

      await addDoc(collection(db, 'laneBookings'), payload);

      Alert.alert('Booked', `Lane booked for ${finalPlayerName}: ${laneName}`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Missing permissions.');
    }
  };

  const canRequest =
    availableStartOptions.length > 0 &&
    !!selectedStartTime &&
    !!suggestedLane &&
    playerNameInput.trim().length > 0;

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
                  <Text style={styles.dashboardSectionIcon}>🛣️</Text>
                </View>
                <Text style={styles.dashboardSectionTitle}>Book a Coaching Lane</Text>
              </View>
            </View>
            <View style={styles.dashboardSectionDivider} />

            <Text style={styles.inputLabel}>Player name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Type player name"
              value={playerNameInput}
              onChangeText={handlePlayerNameChange}
            />

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Pick existing player (optional)</Text>
            <View style={styles.playerPickerCard}>
              <Picker
                selectedValue={selectedPlayerId}
                onValueChange={(v) => handleSelectPlayer(String(v))}
              >
                <Picker.Item label="Select player" value="" />
                {players.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.id} />
                ))}
              </Picker>
            </View>
            <Text style={styles.helperText}>
              Type a name above or pick from the list to auto-fill.
            </Text>

            <Text style={styles.inputLabel}>Lane type</Text>
            <View style={styles.pillRow}>
              {[
                { label: 'All', value: 'all' },
                { label: 'Short', value: 'short' },
                { label: 'Long', value: 'long' },
              ].map((opt) => {
                const active = laneType === (opt.value as any);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.rolePill, active ? styles.rolePillActive : null]}
                    onPress={() => setLaneType(opt.value as any)}
                  >
                    <Text style={[styles.rolePillText, active ? styles.rolePillTextActive : null]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 12 }]}
              onPress={() => setUseSpecificLane((prev) => !prev)}
            >
              <Text style={styles.secondaryButtonText}>
                {useSpecificLane ? '🎯 Picking a specific lane' : '🎯 Pick a specific lane (optional)'}
              </Text>
            </TouchableOpacity>

            {useSpecificLane ? (
              <View style={[styles.playerPickerCard, { marginTop: 8 }]}>
                <Picker
                  selectedValue={selectedLaneId}
                  onValueChange={(v) => setSelectedLaneId(String(v))}
                >
                  <Picker.Item label="Select lane" value="" />
                  {filteredLanes.map((l) => (
                    <Picker.Item key={l.id} label={l.laneName} value={l.id} />
                  ))}
                </Picker>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 14 }]}
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

            <Text style={[styles.playerWelcomeSubText, { marginTop: 10 }]}>
              {dayHours.isClosed
                ? 'Closed for this day.'
                : `Opening hours: ${dayHours.open} – ${dayHours.close}`}
            </Text>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { marginTop: 12, opacity: availableStartOptions.length ? 1 : 0.6 },
              ]}
              onPress={openTimePicker}
              disabled={availableStartOptions.length === 0}
            >
              <Text style={styles.secondaryButtonText}>
                ⏰ {selectedStartTime ? selectedStartTime : 'Select start time'}
              </Text>
            </TouchableOpacity>

            {!dayHours.isClosed && availableStartOptions.length === 0 ? (
              <Text style={[styles.emptyBody, { marginTop: 8 }]}>
                No availability for this date and lane type.
              </Text>
            ) : null}

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Duration</Text>
            <View style={styles.pillRow}>
              {DURATION_OPTIONS.map((d) => {
                const active = selectedDuration === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.rolePill, active ? styles.rolePillActive : null]}
                    onPress={() => setSelectedDuration(d)}
                  >
                    <Text style={[styles.rolePillText, active ? styles.rolePillTextActive : null]}>
                      {d} mins
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedStartTime ? (
              <Text style={[styles.playerWelcomeSubText, { marginTop: 8 }]}>
                Selected: {selectedStartTime} – {toHHMM(toMinutes(selectedStartTime) + Number(selectedDuration || 0))}
              </Text>
            ) : null}

            {selectedStartTime && !suggestedLane ? (
              <Text style={[styles.emptyBody, { marginTop: 8 }]}>
                No lane available at this time.
              </Text>
            ) : suggestedLane ? (
              <Text style={[styles.playerWelcomeSubText, { marginTop: 8 }]}>
                Suggested lane: {suggestedLane.laneName}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 14, opacity: canRequest ? 1 : 0.6 }]}
              onPress={requestBooking}
              disabled={!canRequest}
            >
              <Text style={styles.primaryButtonText}>Book Lane</Text>
            </TouchableOpacity>
          </View>

          <TimePickerModal
            visible={timePicker.visible}
            value={timePicker.value}
            onChange={onTimePicked}
            onCancel={closeTimePicker}
            onConfirm={confirmTimePicker}
          />

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
