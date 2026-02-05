// PlayerFitnessScreenBody.tsx
// ✅ FIXES ADDED:
// 1) Coach-assigned drills AUTO-MOVE to Completed when player submits (single update to the same fitnessEntries doc).
// 2) History now includes BOTH:
//    - player-created entries (source='player')
//    - coach-assigned entries that the player completed (source='coach' + status='completed')
// 3) Button text updated to "Submit (Auto-complete)" to reflect the behaviour.
// ✅ DATE FORMAT FIX:
// - Uses shared utils from ../utils/dateFormat for consistent labels.

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
} from 'react-native';

import { styles } from '../styles/styles';
import { useAuth } from '../context/AuthContext';
import { db, serverTimestamp } from '../firebase';

import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

// ✅ shared date utils
import { safeToDate, formatDayDateTime } from '../utils/dateFormatter';

type Drill = { drill: string; reps: string; sets: string; notes: string };

type FitnessEntry = {
  id: string;
  playerId: string;
  playerName: string;

  coachId?: string | null;
  coachName?: string | null;

  drills: Drill[];

  source: 'coach' | 'player';
  status: 'assigned' | 'submitted' | 'completed';

  sharedToCoach?: boolean;

  createdAtMs?: number;
  createdAtLabel?: string;
  completedAtMs?: number | null;
  completedAtLabel?: string | null;

  // optional metadata
  completedByPlayerId?: string | null;
  completedByPlayerName?: string | null;
};

const MAX_DRILLS = 5;
const emptyDrill = (): Drill => ({ drill: '', reps: '', sets: '', notes: '' });
type Tab = 'coach' | 'self';

export default function PlayerFitnessScreenBody({ navigation }: any) {
  const { firebaseUser, user } = useAuth();
  const uid = firebaseUser?.uid || '';

  const playerName = useMemo(() => {
    const fn = (user as any)?.firstName || '';
    const ln = (user as any)?.lastName || '';
    const full = `${fn} ${ln}`.trim();
    return full || (user as any)?.email || 'Player';
  }, [user]);

  // Optional: preferred coach in player profile
  const preferredCoachId = (user as any)?.coachId || '';
  const preferredCoachName =
    (user as any)?.coachName ||
    (user as any)?.assignedCoachName ||
    'Coach';

  const [tab, setTab] = useState<Tab>('coach');

  // Coach assigned ACTIVE entries (player sees these)
  const [coachAssigned, setCoachAssigned] = useState<FitnessEntry[]>([]);

  // History entries (player-created + completed coach-assigned)
  const [historyEntries, setHistoryEntries] = useState<FitnessEntry[]>([]);

  // Self performed form
  const [shareToCoach, setShareToCoach] = useState(true);
  const [drills, setDrills] = useState<Drill[]>([emptyDrill()]);

  const updateDrill = (index: number, patch: Partial<Drill>) => {
    setDrills(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addMoreDrill = () => {
    setDrills(prev => (prev.length >= MAX_DRILLS ? prev : [...prev, emptyDrill()]));
  };

  const removeDrill = (index: number) => {
    setDrills(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  useEffect(() => {
    // If no coach linked, force self-only
    if (!preferredCoachId) {
      setShareToCoach(false);
    }
  }, [preferredCoachId]);

  // ✅ ONE listener: all entries for player, then filter client-side
  useEffect(() => {
    if (!uid) return;

    const qAll = query(
      collection(db, 'fitnessEntries'),
      where('playerId', '==', uid),
      orderBy('createdAtMs', 'desc'),
      limit(120)
    );

    const unsub = onSnapshot(
      qAll,
      snap => {
        const rows: FitnessEntry[] = snap.docs.map(d => {
          const data: any = d.data();

          // ✅ Consistent labels using shared safeToDate + formatDayDateTime
          const createdDt =
            safeToDate(data?.createdAt) ||
            safeToDate(data?.createdAtMs) ||
            (data?.createdAtLabel ? safeToDate(String(data.createdAtLabel)) : null);

          const completedDt =
            safeToDate(data?.completedAt) ||
            safeToDate(data?.completedAtMs) ||
            (data?.completedAtLabel ? safeToDate(String(data.completedAtLabel)) : null);

          const createdAtLabel = createdDt ? formatDayDateTime(createdDt) : (data?.createdAtLabel ? String(data.createdAtLabel) : '');
          const completedAtLabel = completedDt ? formatDayDateTime(completedDt) : (data?.completedAtLabel ? String(data.completedAtLabel) : '');

          return {
            id: d.id,
            playerId: data.playerId,
            playerName: data.playerName || '',
            coachId: data.coachId ?? null,
            coachName: data.coachName ?? null,
            drills: Array.isArray(data.drills) ? data.drills : [],
            source: (data.source || 'player') as 'coach' | 'player',
            status: (data.status || 'assigned') as 'assigned' | 'submitted' | 'completed',
            sharedToCoach: !!data.sharedToCoach,
            createdAtMs: data.createdAtMs,
            createdAtLabel,
            completedAtMs: data.completedAtMs ?? null,
            completedAtLabel: completedAtLabel || null,
            completedByPlayerId: data?.completedByPlayerId ?? null,
            completedByPlayerName: data?.completedByPlayerName ?? null,
          };
        });

        // ✅ Coach Assigned tab: only coach->assigned (ACTIVE)
        const assigned = rows.filter(r => r.source === 'coach' && r.status === 'assigned');
        setCoachAssigned(assigned);

        // ✅ History:
        // - all player created entries (source=player)
        // - AND coach assigned entries that the player completed (source=coach + completed)
        const history = rows.filter(
          r => r.source === 'player' || (r.source === 'coach' && r.status === 'completed')
        );
        setHistoryEntries(history);
      },
      err => console.log('PlayerFitness listener error:', err)
    );

    return () => unsub();
  }, [uid]);

  const validateSelf = () => {
    if (!uid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return false;
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
      return false;
    }

    if (shareToCoach && !preferredCoachId) {
      // Auto-fallback instead of blocking
      setShareToCoach(false);
    }

    return true;
  };

  const saveSelfPerformed = async () => {
    if (!validateSelf()) return;

    const cleaned = drills
      .map(d => ({
        drill: (d.drill || '').trim(),
        reps: (d.reps || '').trim(),
        sets: (d.sets || '').trim(),
        notes: (d.notes || '').trim(),
      }))
      .filter(d => d.drill.length > 0);

    const now = new Date();
    const createdAtLabel = formatDayDateTime(now); // ✅ consistent
    const createdAtMs = Date.now();

    try {
      const willShare = !!shareToCoach;

      await addDoc(collection(db, 'fitnessEntries'), {
        playerId: uid,
        playerName,

        coachId: willShare ? preferredCoachId : null,
        coachName: willShare ? preferredCoachName : null,

        drills: cleaned,
        source: 'player',
        status: willShare ? 'submitted' : 'completed',
        sharedToCoach: willShare,

        createdAt: serverTimestamp(),
        createdAtMs,
        createdAtLabel,

        completedAt: willShare ? null : serverTimestamp(),
        completedAtMs: willShare ? null : createdAtMs,
        completedAtLabel: willShare ? null : createdAtLabel,
      });

      Alert.alert(
        'Saved',
        willShare
          ? `Submitted to coach (${preferredCoachName}).`
          : 'Saved for self training.'
      );

      setDrills([emptyDrill()]);
    } catch (e: any) {
      console.log('Save self performed error:', e);
      Alert.alert('Failed', e?.message || 'Could not save drills.');
    }
  };

  // ✅ FIX: Player "submit" of coach-assigned drill = auto-move to completed
  const submitAssignedAndAutoComplete = async (entry: FitnessEntry) => {
    if (!uid || !entry?.id) return;

    try {
      Alert.alert(
        'Submit & complete?',
        'This will move the coach-assigned drills to Completed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            style: 'default',
            onPress: async () => {
              const now = new Date();

              await updateDoc(doc(db, 'fitnessEntries', entry.id), {
                status: 'completed',
                completedAt: serverTimestamp(),
                completedAtMs: Date.now(),
                completedAtLabel: formatDayDateTime(now), // ✅ consistent
                completedByPlayerId: uid,
                completedByPlayerName: playerName,
              });

              // No manual state changes needed—listener will move it from coachAssigned -> history
              Alert.alert('Done', 'Moved to Completed.');
            },
          },
        ]
      );
    } catch (e: any) {
      console.log('Auto-complete error:', e);
      Alert.alert('Failed', e?.message || 'Could not update.');
    }
  };

  // ✅ Red segmented toggle (like signup)
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
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#c62828',
          borderRadius: 12,
          padding: 4,
          marginTop: 14,
        }}
      >
        <TouchableOpacity
          onPress={onLeft}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: leftActive ? '#ffffff' : 'transparent',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '700', color: leftActive ? '#c62828' : '#ffffff' }}>
            {leftLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRight}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: leftActive ? 'transparent' : '#ffffff',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '700', color: leftActive ? '#ffffff' : '#c62828' }}>
            {rightLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const lastTwoHistory = historyEntries.slice(0, 2);

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.playerWelcomeSubText}>
            Track fitness drills assigned by coach, or log your own training.
          </Text>

          <SegToggle
            leftLabel="Coach Assigned"
            rightLabel="Self Performed"
            leftActive={tab === 'coach'}
            onLeft={() => setTab('coach')}
            onRight={() => setTab('self')}
          />

          {/* ---------------- Coach Assigned ---------------- */}
          {tab === 'coach' ? (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                Coach Suggested Fitness Drills
              </Text>

              <View style={[styles.toplineSectionCard, { marginTop: 10 }]}>
                {coachAssigned.length === 0 ? (
                  <Text style={styles.emptyBody}>No drills assigned by coach yet.</Text>
                ) : (
                  coachAssigned.map(entry => (
                    <View key={entry.id} style={{ marginTop: 12 }}>
                      <Text style={styles.inputLabel}>
                        {(entry.coachName || 'Coach')}{' '}
                        {entry.createdAtLabel ? `• Assigned ${entry.createdAtLabel}` : ''}
                      </Text>

                      {entry.drills.slice(0, MAX_DRILLS).map((d, i) => (
                        <Text key={i} style={styles.playerWelcomeSubText}>
                          • {d.drill}
                          {d.reps ? ` — Reps: ${d.reps}` : ''}
                          {d.sets ? `, Sets: ${d.sets}` : ''}
                        </Text>
                      ))}

                      <TouchableOpacity
                        style={[styles.primaryButton, { marginTop: 10 }]}
                        onPress={() => submitAssignedAndAutoComplete(entry)}
                      >
                        <Text style={styles.primaryButtonText}>Submit (Auto-complete)</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : null}

          {/* ---------------- Self Performed ---------------- */}
          {tab === 'self' ? (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Log your training</Text>

              <View style={[styles.toplineSectionCard, { marginTop: 10 }]}>
                {/* Share toggle */}
                {preferredCoachId ? (
                  <TouchableOpacity
                    style={[styles.secondaryButton, { marginBottom: 12 }]}
                    onPress={() => setShareToCoach(v => !v)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {shareToCoach ? '✅ Will share to coach' : '⬜ Save for self only'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.toplineSectionCard, { marginBottom: 12, padding: 12 }]}>
                    <Text style={styles.playerWelcomeSubText}>
                      Coach not linked — saving as self training. (Link a coach in Profile to enable sharing.)
                    </Text>
                  </View>
                )}

                {drills.map((d, idx) => (
                  <View key={idx} style={{ marginTop: idx === 0 ? 0 : 14 }}>
                    <Text style={styles.inputLabel}>Drill {idx + 1}</Text>
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
                      placeholder="What should you focus on?"
                      value={d.notes}
                      onChangeText={t => updateDrill(idx, { notes: t })}
                      multiline
                    />

                    {drills.length > 1 ? (
                      <TouchableOpacity
                        style={[styles.secondaryButton, { marginTop: 10 }]}
                        onPress={() => removeDrill(idx)}
                      >
                        <Text style={styles.secondaryButtonText}>Remove drill</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { marginTop: 14, opacity: drills.length >= MAX_DRILLS ? 0.5 : 1 },
                  ]}
                  onPress={addMoreDrill}
                  disabled={drills.length >= MAX_DRILLS}
                >
                  <Text style={styles.secondaryButtonText}>
                    + Add more (up to {MAX_DRILLS})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.primaryButton, { marginTop: 14 }]} onPress={saveSelfPerformed}>
                  <Text style={styles.primaryButtonText}>
                    {shareToCoach ? 'Submit to Coach' : 'Save Training'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {/* ---------------- History (last 2) ---------------- */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>History</Text>
          <View style={[styles.toplineSectionCard, { marginTop: 10 }]}>
            {lastTwoHistory.length === 0 ? (
              <Text style={styles.emptyBody}>No history yet.</Text>
            ) : (
              lastTwoHistory.map(h => (
                <View key={h.id} style={{ marginTop: 10 }}>
                  <Text style={styles.inputLabel}>
                    {h.createdAtLabel || ''}
                    {'  •  '}
                    {h.source === 'coach'
                      ? `Coach Assigned • Completed ${h.completedAtLabel || ''}`
                      : h.sharedToCoach
                        ? `Shared to Coach ${h.coachName || ''}`
                        : 'Self Training'}
                  </Text>

                  {h.drills.slice(0, MAX_DRILLS).map((d, i) => (
                    <Text key={i} style={styles.playerWelcomeSubText}>
                      • {d.drill}
                      {d.reps ? ` — Reps: ${d.reps}` : ''}
                      {d.sets ? `, Sets: ${d.sets}` : ''}
                    </Text>
                  ))}
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>⬅ Return to Player Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}