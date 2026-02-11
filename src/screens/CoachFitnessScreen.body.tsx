// CoachFitnessScreenBody.tsx
// ✅ FIX: Assigned list will NOT show completed items anymore
// - Normalize status/source from Firestore (trim + lowercase)
// - Use assignedEntries / completedEntries consistently in the Tracker
// - Date format remains consistent -> "Tue, 03-Feb-2026"

import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { fetchPlayersAndParents } from "../utils/publicUsers";
import { styles } from '../styles/styles';
import { useAuth } from '../context/AuthContext';
import { db, serverTimestamp } from '../firebase';
import { formatDayDate } from '../utils/dateFormatter';


import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { toplineLogo } from '../constants/assets';

type PlayerLite = { uid: string; name: string };

type Drill = {
  drill: string;
  reps: string;
  sets: string;
  notes: string;
};

type FitnessEntry = {
  id: string;

  coachId?: string | null;
  coachName?: string | null;

  playerId: string;
  playerName?: string;

  drills: Drill[];

  source: 'coach' | 'player';
  status: 'assigned' | 'submitted' | 'completed';

  sharedToCoach?: boolean;

  createdAtMs?: number;
  createdAtLabel?: string;
  completedAtMs?: number | null;
  completedAtLabel?: string | null;

  completedByPlayerId?: string | null;
  completedByPlayerName?: string | null;

  coachReviewedAtMs?: number | null;
  coachReviewedAtLabel?: string | null;
};

const MAX_DRILLS = 5;

const emptyDrill = (): Drill => ({
  drill: '',
  reps: '',
  sets: '',
  notes: '',
});

type Tab = 'review' | 'assign';

export default function CoachFitnessScreenBody({ navigation }: any) {
  const { firebaseUser, profile } = useAuth();
  const coachUid = firebaseUser?.uid || '';

  const coachName = useMemo(() => {
    const fn = (profile as any)?.firstName || '';
    const ln = (profile as any)?.lastName || '';
    const full = `${fn} ${ln}`.trim();
    return full || (profile as any)?.email || 'Coach';
  }, [profile]);

  const [tab, setTab] = useState<Tab>('review');

  // Players dropdown
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Up to 5 drills to assign
  const [drills, setDrills] = useState<Drill[]>([emptyDrill()]);

  // All coach-related entries
  const [allCoachEntries, setAllCoachEntries] = useState<FitnessEntry[]>([]);

  // ✅ Tracker lists (robust + normalized)
  const assignedEntries = useMemo(() => {
    return allCoachEntries.filter(e => e.source === 'coach' && e.status === 'assigned');
  }, [allCoachEntries]);

  const completedEntries = useMemo(() => {
    return allCoachEntries.filter(e => e.source === 'coach' && e.status === 'completed');
  }, [allCoachEntries]);

  // Load registered players
  // Load registered players (players + parents)
useEffect(() => {
  const loadPlayers = async () => {
    try {
      setLoadingPlayers(true);

      const list = await fetchPlayersAndParents(200);

      // CoachFitnessScreen expects { uid, name }
      const mapped: PlayerLite[] = list.map((u) => ({
        uid: u.id,
        name: u.name,
      }));

      setPlayers(mapped);
    } catch (e) {
      console.log("Load players error:", e);
    } finally {
      setLoadingPlayers(false);
    }
  };

  loadPlayers();
}, []);



  // ✅ ONE listener: where(coachId==coachUid) then filter in JS
  useEffect(() => {
    if (!coachUid) return;

    const qAll = query(
      collection(db, 'fitnessEntries'),
      where('coachId', '==', coachUid),
      orderBy('createdAtMs', 'desc'),
      limit(200)
    );

    const unsub = onSnapshot(
      qAll,
      snap => {
        const rows: FitnessEntry[] = snap.docs.map(d => {
          const data: any = d.data();

          // ✅ Normalize (this is the key fix)
          const norm = (v: any) => String(v ?? '').trim().toLowerCase();
          const source = (norm(data.source) || 'coach') as 'coach' | 'player';
          const status = (norm(data.status) || 'assigned') as 'assigned' | 'submitted' | 'completed';

          // ✅ consistent label
          const createdAtLabel = data?.createdAtMs
            ? formatDayDate(new Date(Number(data.createdAtMs)))
            : data?.createdAt?.toDate?.()
              ? formatDayDate(data.createdAt.toDate())
              : (data?.createdAtLabel ? String(data.createdAtLabel) : '');

          // ✅ consistent label
          const completedAtLabel = data?.completedAtMs
            ? formatDayDate(new Date(Number(data.completedAtMs)))
            : data?.completedAt?.toDate?.()
              ? formatDayDate(data.completedAt.toDate())
              : (data?.completedAtLabel ? String(data.completedAtLabel) : '');

          return {
            id: d.id,
            coachId: data.coachId ?? null,
            coachName: data.coachName ?? null,
            playerId: data.playerId,
            playerName: data.playerName || '',
            drills: Array.isArray(data.drills) ? data.drills : [],
            source,
            status,
            sharedToCoach: !!data.sharedToCoach,
            createdAtMs: data.createdAtMs,
            createdAtLabel,
            completedAtMs: data.completedAtMs ?? null,
            completedAtLabel: completedAtLabel || null,
            completedByPlayerId: data?.completedByPlayerId ?? null,
            completedByPlayerName: data?.completedByPlayerName ?? null,
            coachReviewedAtMs: data?.coachReviewedAtMs ?? null,
            coachReviewedAtLabel: data?.coachReviewedAtLabel ?? null,
          };
        });

        setAllCoachEntries(rows);
      },
      err => console.log('CoachFitness listener error:', err)
    );

    return () => unsub();
  }, [coachUid]);

  const selectedPlayerName = useMemo(() => {
    return players.find(p => p.uid === selectedPlayerId)?.name || '';
  }, [players, selectedPlayerId]);

  const updateDrill = (index: number, patch: Partial<Drill>) => {
    setDrills(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addMoreDrill = () => {
    setDrills(prev => (prev.length >= MAX_DRILLS ? prev : [...prev, emptyDrill()]));
  };

  const removeDrill = (index: number) => {
    setDrills(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const assignToPlayer = async () => {
    if (!coachUid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!selectedPlayerId) {
      Alert.alert('Select a player', 'Please choose a registered player first.');
      return;
    }

    const cleaned = drills
      .map(d => ({
        drill: (d.drill || '').trim(),
        reps: (d.reps || '').trim(),
        sets: (d.sets || '').trim(),
        notes: (d.notes || '').trim(),
      }))
      .filter(d => d.drill.length > 0);

    if (cleaned.length === 0) {
      Alert.alert('Add at least 1 drill', 'Please enter a drill name.');
      return;
    }

    const now = new Date();
    const createdAtMs = Date.now();
    const createdAtLabel = formatDayDate(now);

    try {
      await addDoc(collection(db, 'fitnessEntries'), {
        coachId: coachUid,
        coachName,

        playerId: selectedPlayerId,
        playerName: selectedPlayerName,

        drills: cleaned,

        source: 'coach',
        status: 'assigned',
        sharedToCoach: false,

        createdAt: serverTimestamp(),
        createdAtMs,
        createdAtLabel,

        completedAt: null,
        completedAtMs: null,
        completedAtLabel: null,
      });

      Alert.alert('Assigned', 'Fitness drills assigned to player.');
      setSelectedPlayerId('');
      setDrills([emptyDrill()]);
    } catch (e: any) {
      console.log('Assign fitness failed:', e);
      Alert.alert('Failed', e?.message || 'Could not assign drills.');
    }
  };

  // ✅ Review list: only player submissions shared to this coach
  const playerSubmissions = useMemo(() => {
    return allCoachEntries.filter(
      x => x.source === 'player' && x.sharedToCoach && x.status === 'submitted'
    );
  }, [allCoachEntries]);

  const markPlayerSubmissionCompleted = async (entry: FitnessEntry) => {
    if (!coachUid || !entry?.id) return;

    Alert.alert(
      'Mark as reviewed?',
      'This will move the player submission out of Review and into Completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Reviewed',
          style: 'default',
          onPress: async () => {
            try {
              const now = new Date();
              await updateDoc(doc(db, 'fitnessEntries', entry.id), {
                status: 'completed',
                completedAt: serverTimestamp(),
                completedAtMs: Date.now(),
                completedAtLabel: formatDayDate(now),
                coachReviewedAtMs: Date.now(),
                coachReviewedAtLabel: formatDayDate(now),
              });

              Alert.alert('Done', 'Marked as reviewed.');
            } catch (e: any) {
              console.log('Mark submission reviewed error:', e);
              Alert.alert('Failed', e?.message || 'Could not update.');
            }
          },
        },
      ]
    );
  };

  const SegToggle = ({
    leftLabel,
    rightLabel,
    leftActive,
    onLeft,
    onRight,
  }: {
    leftLabel: string;
    rightLabel: string;
    leftActive: boolean;
    onLeft: () => void;
    onRight: () => void;
  }) => {
    return (
      <View style={styles.coachFitnessSegWrap}>
        <TouchableOpacity
          onPress={onLeft}
          style={[styles.coachFitnessSegBtn, leftActive ? styles.coachFitnessSegBtnActive : null]}
        >
          <Text style={[styles.coachFitnessSegText, leftActive ? styles.coachFitnessSegTextActive : null]}>
            {leftLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRight}
          style={[styles.coachFitnessSegBtn, !leftActive ? styles.coachFitnessSegBtnActive : null]}
        >
          <Text style={[styles.coachFitnessSegText, !leftActive ? styles.coachFitnessSegTextActive : null]}>
            {rightLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.coachFitnessHeroCard}>
            <View style={styles.coachFitnessHeroRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.coachFitnessHeroTitle}>Review Fitness</Text>
                <Text style={styles.coachFitnessHeroSub}>
                  Assign drills, review submissions, and track completion.
                </Text>
              </View>
              <Image source={toplineLogo} style={styles.coachFitnessHeroLogo} />
            </View>

            <View style={styles.coachFitnessStatsRow}>
              <View style={[styles.coachFitnessStatPill, { marginRight: 8 }]}>
                <Text style={styles.coachFitnessStatValue}>{playerSubmissions.length}</Text>
                <Text style={styles.coachFitnessStatLabel}>Pending</Text>
              </View>
              <View style={[styles.coachFitnessStatPill, { marginRight: 8 }]}>
                <Text style={styles.coachFitnessStatValue}>{assignedEntries.length}</Text>
                <Text style={styles.coachFitnessStatLabel}>Assigned</Text>
              </View>
              <View style={styles.coachFitnessStatPill}>
                <Text style={styles.coachFitnessStatValue}>{completedEntries.length}</Text>
                <Text style={styles.coachFitnessStatLabel}>Completed</Text>
              </View>
            </View>
          </View>
          <SegToggle
            leftLabel="Review Fitness"
            rightLabel="Assign Fitness"
            leftActive={tab === 'review'}
            onLeft={() => setTab('review')}
            onRight={() => setTab('assign')}
          />

          {tab === 'review' ? (
            <View style={styles.dashboardSectionWrap}>
              <View style={styles.dashboardSectionHeader}>
                <View style={styles.dashboardSectionHeaderLeft}>
                  <View style={styles.dashboardSectionIconWrap}>
                    <Text style={styles.dashboardSectionIcon}>🧾</Text>
                  </View>
                  <Text style={styles.dashboardSectionTitle}>From Players</Text>
                </View>
              </View>
              <View style={styles.dashboardSectionDivider} />

              <View style={styles.coachFitnessCard}>
                <View style={styles.coachFitnessCardHeaderRow}>
                  <Text style={styles.coachFitnessCardTitle}>Submissions</Text>
                  <View style={styles.coachFitnessBadge}>
                    <Text style={styles.coachFitnessBadgeText}>{playerSubmissions.length} Pending</Text>
                  </View>
                </View>

                {playerSubmissions.length === 0 ? (
                  <Text style={styles.coachFitnessEmptyText}>
                    No fitness updates submitted by players yet.
                  </Text>
                ) : (
                  playerSubmissions.map(x => (
                    <View key={x.id} style={styles.coachFitnessListItem}>
                      <View style={styles.coachFitnessListHeaderRow}>
                        <Text style={styles.coachFitnessListTitle}>{x.playerName || 'Player'}</Text>
                        <View style={styles.coachFitnessPill}>
                          <Text style={styles.coachFitnessPillText}>Submitted</Text>
                        </View>
                      </View>
                      <Text style={styles.coachFitnessListMeta}>{x.createdAtLabel || ''}</Text>

                      {x.drills.slice(0, MAX_DRILLS).map((d, i) => (
                        <View key={i} style={styles.coachFitnessBulletRow}>
                          <Text style={styles.coachFitnessBulletDot}>•</Text>
                          <Text style={styles.coachFitnessBulletText}>
                            {d.drill}
                            {d.reps ? ` — Reps: ${d.reps}` : ''}
                            {d.sets ? `, Sets: ${d.sets}` : ''}
                          </Text>
                        </View>
                      ))}

                      <TouchableOpacity
                        style={[styles.primaryButton, styles.coachFitnessActionBtn]}
                        onPress={() => markPlayerSubmissionCompleted(x)}
                      >
                        <Text style={styles.primaryButtonText}>Mark Reviewed</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : null}

          {tab === 'assign' ? (
            <>
              <View style={styles.dashboardSectionWrap}>
                <View style={styles.dashboardSectionHeader}>
                  <View style={styles.dashboardSectionHeaderLeft}>
                    <View style={styles.dashboardSectionIconWrap}>
                      <Text style={styles.dashboardSectionIcon}>🏋️</Text>
                    </View>
                    <Text style={styles.dashboardSectionTitle}>Assign a Drill</Text>
                  </View>
                </View>
                <View style={styles.dashboardSectionDivider} />

                <View style={styles.coachFitnessCard}>
                  <View style={styles.coachFitnessCardHeaderRow}>
                    <Text style={styles.coachFitnessCardTitle}>Player Selection</Text>
                  </View>

                  <View style={styles.pickerCard}>
                    <Picker
                      enabled={!loadingPlayers}
                      selectedValue={selectedPlayerId}
                      onValueChange={value => setSelectedPlayerId(String(value))}
                    >
                      <Picker.Item label={loadingPlayers ? 'Loading players…' : 'Player'} value="" />
                      {players.map(p => (
                        <Picker.Item key={p.uid} label={p.name} value={p.uid} />
                      ))}
                    </Picker>
                  </View>

                {drills.map((d, idx) => (
                  <View key={idx} style={styles.coachFitnessDrillBlock}>
                    <View style={styles.coachFitnessDrillHeader}>
                      <Text style={styles.inputLabel}>Drill {idx + 1}</Text>
                      {drills.length > 1 ? (
                        <TouchableOpacity onPress={() => removeDrill(idx)} activeOpacity={0.9}>
                          <Text style={styles.coachFitnessRemoveText}>Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Plank hold"
                      value={d.drill}
                      onChangeText={t => updateDrill(idx, { drill: t })}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>Reps</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 10"
                      value={d.reps}
                      onChangeText={t => updateDrill(idx, { reps: t })}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>Sets</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 3"
                      value={d.sets}
                      onChangeText={t => updateDrill(idx, { sets: t })}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>Notes (optional)</Text>
                    <TextInput
                      style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                      placeholder="What should the player focus on?"
                      value={d.notes}
                      onChangeText={t => updateDrill(idx, { notes: t })}
                      multiline
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 14, opacity: drills.length >= MAX_DRILLS ? 0.5 : 1 }]}
                  onPress={addMoreDrill}
                  disabled={drills.length >= MAX_DRILLS}
                >
                  <Text style={styles.secondaryButtonText}>+ Add more (up to {MAX_DRILLS})</Text>
                </TouchableOpacity>

                  <TouchableOpacity style={[styles.primaryButton, { marginTop: 14 }]} onPress={assignToPlayer}>
                    <Text style={styles.primaryButtonText}>Assign to Player</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tracker */}
              <View style={styles.dashboardSectionWrap}>
                <View style={styles.dashboardSectionHeader}>
                  <View style={styles.dashboardSectionHeaderLeft}>
                    <View style={styles.dashboardSectionIconWrap}>
                      <Text style={styles.dashboardSectionIcon}>📊</Text>
                    </View>
                    <Text style={styles.dashboardSectionTitle}>Tracker</Text>
                  </View>
                </View>
                <View style={styles.dashboardSectionDivider} />

                <View style={styles.coachFitnessCard}>
                  <View style={styles.coachFitnessCardHeaderRow}>
                    <Text style={styles.coachFitnessCardTitle}>Assigned</Text>
                    <View style={styles.coachFitnessBadge}>
                      <Text style={styles.coachFitnessBadgeText}>{assignedEntries.length}</Text>
                    </View>
                  </View>
                  {assignedEntries.length === 0 ? (
                    <Text style={styles.coachFitnessEmptyText}>No fitness drills assigned yet.</Text>
                  ) : (
                    assignedEntries.map(x => (
                      <View key={x.id} style={styles.coachFitnessListItem}>
                        <View style={styles.coachFitnessListHeaderRow}>
                          <Text style={styles.coachFitnessListTitle}>{x.playerName || 'Player'}</Text>
                          <View style={styles.coachFitnessPill}>
                            <Text style={styles.coachFitnessPillText}>Assigned</Text>
                          </View>
                        </View>
                        <Text style={styles.coachFitnessListMeta}>
                          Assigned {x.createdAtLabel || ''}
                        </Text>
                        {x.drills.slice(0, MAX_DRILLS).map((d, i) => (
                          <View key={i} style={styles.coachFitnessBulletRow}>
                            <Text style={styles.coachFitnessBulletDot}>•</Text>
                            <Text style={styles.coachFitnessBulletText}>
                              {d.drill}
                              {d.reps ? ` — Reps: ${d.reps}` : ''}
                              {d.sets ? `, Sets: ${d.sets}` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </View>

                <View style={[styles.coachFitnessCard, { marginTop: 14 }]}>
                  <View style={styles.coachFitnessCardHeaderRow}>
                    <Text style={styles.coachFitnessCardTitle}>Completed</Text>
                    <View style={[styles.coachFitnessBadge, styles.coachFitnessBadgeSuccess]}>
                      <Text style={[styles.coachFitnessBadgeText, styles.coachFitnessBadgeSuccessText]}>
                        {completedEntries.length}
                      </Text>
                    </View>
                  </View>
                  {completedEntries.length === 0 ? (
                    <Text style={styles.coachFitnessEmptyText}>No completed drills yet.</Text>
                  ) : (
                    completedEntries.map(x => (
                      <View key={x.id} style={styles.coachFitnessListItem}>
                        <View style={styles.coachFitnessListHeaderRow}>
                          <Text style={styles.coachFitnessListTitle}>{x.playerName || 'Player'}</Text>
                          <View style={[styles.coachFitnessPill, styles.coachFitnessPillSuccess]}>
                            <Text style={[styles.coachFitnessPillText, styles.coachFitnessPillSuccessText]}>
                              Completed
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.coachFitnessListMeta}>
                          Completed {x.completedAtLabel || x.createdAtLabel || ''}
                          {x.completedByPlayerName ? ` • by ${x.completedByPlayerName}` : ''}
                        </Text>
                        {x.drills.slice(0, MAX_DRILLS).map((d, i) => (
                          <View key={i} style={styles.coachFitnessBulletRow}>
                            <Text style={styles.coachFitnessBulletDot}>•</Text>
                            <Text style={styles.coachFitnessBulletText}>
                              {d.drill}
                              {d.reps ? ` — Reps: ${d.reps}` : ''}
                              {d.sets ? `, Sets: ${d.sets}` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </View>
            </>
          ) : null}

          <TouchableOpacity style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>⬅ Return to Coach Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
