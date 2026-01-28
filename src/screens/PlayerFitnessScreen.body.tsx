import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

import { Picker } from '@react-native-picker/picker';

import { styles } from '../styles/styles';
import type { PlayerFitnessProps } from './PlayerFitnessScreen';
import type { FitnessEntry } from '../types';

import { useAuth } from '../context/AuthContext';
import { db, serverTimestamp } from '../firebase';

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';

const MAX_SETS = 50;
const MAX_REPS = 500;
const MAX_EXERCISES_PER_SUBMIT = 5;
const DAYS_TO_SHOW = 14;

type CoachLite = { id: string; name: string };
type DraftExercise = { description: string; sets: number; reps: number };


const TOPLINE_LOGO = require('../../assets/topline-cricket-image.jpg');
const PlayerFitnessScreenBody: React.FC<PlayerFitnessProps> = ({ navigation }) => {
  const { firebaseUser, profile } = useAuth();
  const uid = firebaseUser?.uid || '';

  const playerName = useMemo(() => {
    const fn = (profile as any)?.firstName || '';
    const ln = (profile as any)?.lastName || '';
    const full = `${fn} ${ln}`.trim();
    return full || (profile as any)?.email || 'Player';
  }, [profile]);

  const [description, setDescription] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');

  // ✅ Firebase-backed entries (last 14 days)
  const [entries, setEntries] = useState<FitnessEntry[]>([]);

  // ✅ Coach requested toggle + coach list
  const [coachRequested, setCoachRequested] = useState(false);
  const [coaches, setCoaches] = useState<CoachLite[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');

  const coachNameById = (coachId: string) =>
    coaches.find((c) => c.id === coachId)?.name ?? '';

  
  // -----------------------------
  // Player Fitness Entry
  // -----------------------------


  const resetInput = () => {
  setDescription('');
  setSets('');
  setReps('');
};
const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);
const addDraftExercise = () => {
  const trimmedDesc = description.trim();
  const setsNum = Number(sets);
  const repsNum = Number(reps);

  if (!trimmedDesc) {
    Alert.alert('Missing exercise', 'Please enter an exercise name/description.');
    return;
  }
  if (!Number.isFinite(setsNum) || setsNum <= 0 || setsNum > MAX_SETS) {
    Alert.alert('Invalid sets', `Please enter sets between 1 and ${MAX_SETS}.`);
    return;
  }
  if (!Number.isFinite(repsNum) || repsNum <= 0 || repsNum > MAX_REPS) {
    Alert.alert('Invalid reps', `Please enter reps between 1 and ${MAX_REPS}.`);
    return;
  }

  if (draftExercises.length >= MAX_EXERCISES_PER_SUBMIT) {
    Alert.alert(
      'Limit reached',
      `You can add up to ${MAX_EXERCISES_PER_SUBMIT} exercises per submission.`
    );
    return;
  }

  setDraftExercises((prev) => [...prev, { description: trimmedDesc, sets: setsNum, reps: repsNum }]);
  resetInput();
};

const removeDraftExercise = (idx: number) => {
  setDraftExercises((prev) => prev.filter((_, i) => i !== idx));
};

  // -----------------------------
  // Load coaches (role == coach)
  // -----------------------------
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        setLoadingCoaches(true);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'coach'), limit(50));
        const snap = await getDocs(q);

        const list: CoachLite[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const name =
            `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() ||
            data.email ||
            'Coach';
          return { id: d.id, name };
        });

        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCoaches(list);
      } catch (e) {
        console.log('Load coaches error:', e);
      } finally {
        setLoadingCoaches(false);
      }
    };

    loadCoaches();
  }, []);

  useEffect(() => {
  if (!uid) return;

  const refCol = collection(db, 'fitnessEntries');

  const q = query(
    refCol,
    where('playerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(5)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data: any = d.data();

        // createdAt might be Firestore Timestamp
        const createdAtMs =
          data?.createdAt?.toMillis?.() ??
          (typeof data?.createdAt === 'number' ? data.createdAt : Date.now());

        return {
          id: d.id,
          createdAt: createdAtMs,
          dateKey: data.dateKey || '',
          dateLabel: data.dateLabel || '',
          description: data.description || '',
          sets: Number(data.sets || 0),
          reps: Number(data.reps || 0),
        };
      });

      setEntries(list);
    },
    (err) => {
      console.log('fitnessEntries listener error:', err);
    }
  );

  return () => unsub();
}, [uid]);


  // -----------------------------
  // Load last 14 days fitness entries for this player
  // -----------------------------
  useEffect(() => {
    const loadRecentFitness = async () => {
      try {
        if (!uid) return;

        const sinceMs = Date.now() - DAYS_TO_SHOW * 24 * 60 * 60 * 1000;
        const since = Timestamp.fromMillis(sinceMs);

        const refCol = collection(db, 'fitnessEntries');
        const q = query(
          refCol,
          where('playerId', '==', uid),
          where('createdAt', '>=', since),
          orderBy('createdAt', 'desc')
        );

        const snap = await getDocs(q);

        const list: FitnessEntry[] = snap.docs.map((d) => {
          const data = d.data() as any;

          // createdAt in Firestore is Timestamp; normalize to number for your UI grouping logic
          const createdAtMs =
            typeof data.createdAt?.toMillis === 'function'
              ? data.createdAt.toMillis()
              : Date.now();

          return {
            id: d.id,
            createdAt: createdAtMs,
            dateKey: data.dateKey || new Date(createdAtMs).toISOString().slice(0, 10),
            dateLabel:
              data.dateLabel || new Date(createdAtMs).toLocaleDateString(),
            description: data.description || '',
            sets: Number(data.sets || 0),
            reps: Number(data.reps || 0),
          };
        });

        setEntries(list);
      } catch (e) {
        console.log('Load fitness error:', e);
      }
    };

    loadRecentFitness();
  }, [uid]);

  const handleAddEntry = async () => {
  if (!uid) {
    Alert.alert('Not signed in', 'Please sign in again.');
    return;
  }

  // If user forgot to press "Add more" for the current typed row,
  // we can auto-add it ONLY if any field is filled.
  const hasTypedRow = description.trim() || sets.trim() || reps.trim();
  let batchExercises = [...draftExercises];

  if (hasTypedRow) {
    const trimmedDesc = description.trim();
    const setsNum = Number(sets);
    const repsNum = Number(reps);

    if (!trimmedDesc) {
      Alert.alert('Missing exercise', 'Please enter an exercise name/description.');
      return;
    }
    if (!Number.isFinite(setsNum) || setsNum <= 0 || setsNum > MAX_SETS) {
      Alert.alert('Invalid sets', `Please enter sets between 1 and ${MAX_SETS}.`);
      return;
    }
    if (!Number.isFinite(repsNum) || repsNum <= 0 || repsNum > MAX_REPS) {
      Alert.alert('Invalid reps', `Please enter reps between 1 and ${MAX_REPS}.`);
      return;
    }

    if (batchExercises.length >= MAX_EXERCISES_PER_SUBMIT) {
      Alert.alert(
        'Limit reached',
        `You can add up to ${MAX_EXERCISES_PER_SUBMIT} exercises per submission.`
      );
      return;
    }

    batchExercises = [...batchExercises, { description: trimmedDesc, sets: setsNum, reps: repsNum }];
  }

  if (batchExercises.length === 0) {
    Alert.alert('No exercises', 'Please add at least one exercise.');
    return;
  }

  if (coachRequested && !selectedCoachId) {
    Alert.alert('Select coach', 'Please choose a coach to submit this to.');
    return;
  }

  const now = Date.now();
  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);
  const dateLabel = today.toLocaleDateString();

  try {
    const coachName = coachRequested ? coachNameById(selectedCoachId) : '';

    // Save each exercise as a separate doc (simplest + works with your history UI)
    const writes = batchExercises.map((ex) =>
      addDoc(collection(db, 'fitnessEntries'), {
        playerId: uid,
        playerName,

        coachRequested: !!coachRequested,
        coachId: coachRequested ? selectedCoachId : '',
        coachName: coachRequested ? coachName : '',

        description: ex.description,
        sets: ex.sets,
        reps: ex.reps,

        dateKey,
        dateLabel,

        createdAt: serverTimestamp(),
        status: coachRequested ? 'submitted' : 'self',
      })
    );

    await Promise.all(writes);

    // Add to local list instantly (keeps UI responsive)
    const newEntries: FitnessEntry[] = batchExercises.map((ex, i) => ({
      id: `${now}_${i}`,
      createdAt: now - i, // small ordering nudge
      dateKey,
      dateLabel,
      description: ex.description,
      sets: ex.sets,
      reps: ex.reps,
    }));

    setEntries((prev) => [...newEntries, ...prev]);

    // Clear
    setDraftExercises([]);
    resetInput();

    Alert.alert(
      'Saved',
      coachRequested ? 'Submitted to coach.' : 'Saved to your history.'
    );
  } catch (e: any) {
    console.log('Save fitness failed:', e);
    Alert.alert('Save failed', e?.message || 'Could not save to Firebase.');
  }
};

  // group entries by dateKey (your existing logic)
  const entriesByDate = useMemo(() => {
    const map: Record<string, FitnessEntry[]> = {};
    for (const e of entries) {
      if (!map[e.dateKey]) map[e.dateKey] = [];
      map[e.dateKey].push(e);
    }
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => b.createdAt - a.createdAt);
    });
    return map;
  }, [entries]);

  const orderedDates = useMemo(() => {
    return Object.keys(entriesByDate).sort((a, b) => (a < b ? 1 : -1));
  }, [entriesByDate]);

  // summary (same logic)
  const totalExercises = entries.length;
  const totalDays = orderedDates.length;
  const totalSets = entries.reduce((sum, e) => sum + e.sets, 0);
  const totalReps = entries.reduce((sum, e) => sum + e.reps, 0);

  const badges: string[] = [];
  if (totalDays >= 3) badges.push('3+ active days');
  if (totalExercises >= 10) badges.push('10+ exercises logged');
  if (totalReps >= 300) badges.push('300+ reps completed');

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <Text style={styles.sectionTitle}>Fitness Log</Text>
<Image source={TOPLINE_LOGO} style={[styles.headerLogo, {alignSelf:'flex-end'}]} />
        <Text style={styles.playerWelcomeSubText}>
          Log your basic fitness work: exercise name, sets and reps.
          {'\n'}Showing last {DAYS_TO_SHOW} days.
        </Text>

        {/* Summary */}
        {entries.length > 0 && (
          <View style={styles.playerCard}>
            <Text style={styles.playerCardTitle}>Summary</Text>

            <Text style={styles.playerCardBodyText}>Days trained: {totalDays}</Text>
            <Text style={styles.playerCardBodyText}>Exercises logged: {totalExercises}</Text>
            <Text style={styles.playerCardBodyText}>
              Total volume: {totalSets} sets · {totalReps} reps
            </Text>

            {badges.length > 0 && (
              <View style={styles.fitnessBadgesRow}>
                {badges.map((badge) => (
                  <View key={badge} style={styles.fitnessBadge}>
                    <Text style={styles.fitnessBadgeText}>{badge}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Input */}
        <View style={styles.playerCard}>
          <Text style={styles.statsLabel}>Exercise / Description</Text>
          <TextInput
            style={styles.statsInput}
            placeholder="e.g. Push Ups, Squats, Sprints"
            value={description}
            onChangeText={setDescription}
          />

          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.statsLabel}>Sets</Text>
              <TextInput
                style={styles.statsInput}
                placeholder="e.g. 3"
                value={sets}
                onChangeText={setSets}
                keyboardType="number-pad"
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.statsLabel}>Reps</Text>
              <TextInput
                style={styles.statsInput}
                placeholder="e.g. 12 (or seconds)"
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
              />
            </View>
          </View>

{/* Draft exercises list (max 5) */}
{draftExercises.length > 0 ? (
  <View style={{ marginTop: 12 }}>
    <Text style={styles.statsLabel}>
      Exercises to submit ({draftExercises.length}/{MAX_EXERCISES_PER_SUBMIT})
    </Text>

    {draftExercises.map((ex, idx) => (
      <View key={`${ex.description}_${idx}`} style={styles.fitnessTableRow}>
        <Text style={[styles.fitnessTableCellText, { flex: 2 }]} numberOfLines={1}>
          {ex.description}
        </Text>
        <Text style={[styles.fitnessTableCellText, { flex: 1, textAlign: 'center' }]}>
          {ex.sets}
        </Text>
        <Text style={[styles.fitnessTableCellText, { flex: 1, textAlign: 'center' }]}>
          {ex.reps}
        </Text>

        <TouchableOpacity onPress={() => removeDraftExercise(idx)} style={{ marginLeft: 10 }}>
          <Text style={[styles.fitnessTableCellText, { textAlign: 'center' }]}>✕</Text>
        </TouchableOpacity>
      </View>
    ))}
  </View>
) : null}

          {/* ✅ Coach requested toggle (no new styles) */}
          <TouchableOpacity
            onPress={() => {
              const next = !coachRequested;
              setCoachRequested(next);
              if (!next) setSelectedCoachId('');
            }}
            style={{ marginTop: 10 }}
          >
            <Text style={styles.playerWelcomeSubText}>
              {coachRequested ? '☑ ' : '☐ '}
              Coach requested (submit this to a coach)
            </Text>
          </TouchableOpacity>

          {/* ✅ Coach picker only when coach requested */}
          {coachRequested ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.statsLabel}>Select coach</Text>
              <View style={styles.pickerCard}>
                <Picker
                  enabled={!loadingCoaches}
                  selectedValue={selectedCoachId}
                  onValueChange={(value) => setSelectedCoachId(String(value))}
                >
                  <Picker.Item
                    label={loadingCoaches ? 'Loading coaches…' : 'Select a coach...'}
                    value=""
                  />
                  {coaches.map((c) => (
                    <Picker.Item key={c.id} label={c.name} value={c.id} />
                  ))}
                </Picker>
              </View>
            </View>
          ) : null}
<TouchableOpacity
  style={[styles.secondaryButton, { marginTop: 12 }]}
  onPress={addDraftExercise}
  disabled={draftExercises.length >= MAX_EXERCISES_PER_SUBMIT}
>
  <Text style={styles.secondaryButtonText}>
    + Add more exercise
  </Text>
</TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 12 }]}
            onPress={handleAddEntry}
          >
            <Text style={styles.primaryButtonText}>
              {coachRequested ? 'Submit fitness to coach' : 'Save fitness sets'}
            </Text>
          </TouchableOpacity>
        </View>


        {/* Recent sessions */}
        {orderedDates.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
              Recent sessions
            </Text>

            {orderedDates.map((dateKey) => {
              const dayEntries = entriesByDate[dateKey];
              const dateLabel = dayEntries?.[0]?.dateLabel ?? dateKey;

              return (
                <View key={dateKey} style={styles.playerCard}>
                  <Text style={styles.playerCardTitle}>{dateLabel}</Text>

                  <View style={styles.fitnessTableHeaderRow}>
                    <Text style={[styles.fitnessTableHeader, { flex: 2 }]}>Exercise</Text>
                    <Text style={[styles.fitnessTableHeader, { flex: 1, textAlign: 'center' }]}>
                      Sets
                    </Text>
                    <Text style={[styles.fitnessTableHeader, { flex: 1, textAlign: 'center' }]}>
                      Reps
                    </Text>
                  </View>

                  {dayEntries.map((entry) => (
                    <View key={entry.id} style={styles.fitnessTableRow}>
                      <Text style={[styles.fitnessTableCellText, { flex: 2 }]} numberOfLines={1}>
                        {entry.description}
                      </Text>

                      <Text style={[styles.fitnessTableCellText, { flex: 1, textAlign: 'center' }]}>
                        {entry.sets}
                      </Text>

                      <Text style={[styles.fitnessTableCellText, { flex: 1, textAlign: 'center' }]}>
                        {entry.reps}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}


        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>⬅ Return to Player Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlayerFitnessScreenBody;
