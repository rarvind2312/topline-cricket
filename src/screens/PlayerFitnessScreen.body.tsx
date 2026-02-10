// PlayerFitnessScreenBody.tsx
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

  const preferredCoachId = (user as any)?.coachId || '';
  const preferredCoachName =
    (user as any)?.coachName || (user as any)?.assignedCoachName || 'Coach';

  const [tab, setTab] = useState<Tab>('coach');
  const [coachAssigned, setCoachAssigned] = useState<FitnessEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<FitnessEntry[]>([]);

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
    if (!preferredCoachId) setShareToCoach(false);
  }, [preferredCoachId]);

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

          const createdDt =
            safeToDate(data?.createdAt) ||
            safeToDate(data?.createdAtMs) ||
            (data?.createdAtLabel ? safeToDate(String(data.createdAtLabel)) : null);

          const completedDt =
            safeToDate(data?.completedAt) ||
            safeToDate(data?.completedAtMs) ||
            (data?.completedAtLabel ? safeToDate(String(data.completedAtLabel)) : null);

          const createdAtLabel = createdDt
            ? formatDayDateTime(createdDt)
            : (data?.createdAtLabel ? String(data.createdAtLabel) : '');

          const completedAtLabel = completedDt
            ? formatDayDateTime(completedDt)
            : (data?.completedAtLabel ? String(data.completedAtLabel) : '');

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

        setCoachAssigned(rows.filter(r => r.source === 'coach' && r.status === 'assigned'));

        setHistoryEntries(
          rows.filter(r => r.source === 'player' || (r.source === 'coach' && r.status === 'completed'))
        );
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

    if (shareToCoach && !preferredCoachId) setShareToCoach(false);

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
    const createdAtLabel = formatDayDateTime(now);
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

      Alert.alert('Saved', willShare ? `Submitted to coach (${preferredCoachName}).` : 'Saved for self training.');
      setDrills([emptyDrill()]);
    } catch (e: any) {
      console.log('Save self performed error:', e);
      Alert.alert('Failed', e?.message || 'Could not save drills.');
    }
  };

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
                completedAtLabel: formatDayDateTime(now),
                completedByPlayerId: uid,
                completedByPlayerName: playerName,
              });
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

 const [historyExpanded, setHistoryExpanded] = useState(false);

const visibleHistory: FitnessEntry[] = historyExpanded
  ? historyEntries
  : historyEntries.slice(0, 2);

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          {/* Premium header */}
          <View style={styles.fitnessTopCard}>
            <Text style={styles.fitnessTopTitle}>Fitness</Text>
            <Text style={styles.fitnessTopSubtitle}>
              Track coach drills or log your training. Keep it consistent and build progress.
            </Text>

            {/* Seg toggle */}
            <View style={styles.fitnessToggleWrap}>
              <TouchableOpacity
                onPress={() => setTab('coach')}
                style={[styles.fitnessToggleBtn, tab === 'coach' && styles.fitnessToggleBtnActive]}
                activeOpacity={0.9}
              >
                <Text style={[styles.fitnessToggleText, tab === 'coach' && styles.fitnessToggleTextActive]}>
                  Coach Assigned
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTab('self')}
                style={[styles.fitnessToggleBtn, tab === 'self' && styles.fitnessToggleBtnActive]}
                activeOpacity={0.9}
              >
                <Text style={[styles.fitnessToggleText, tab === 'self' && styles.fitnessToggleTextActive]}>
                  Self Performed
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ---------------- Coach Assigned ---------------- */}
          {tab === 'coach' ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Coach Suggested Drills</Text>
              </View>

              <View style={styles.sectionBlock}>
                <View style={styles.toplineSectionCard}>
                  {coachAssigned.length === 0 ? (
                    <Text style={styles.emptyBody}>No drills assigned by coach yet.</Text>
                  ) : (
                    coachAssigned.map(entry => (
                      <View key={entry.id} style={styles.fitnessAssignedCard}>
                        <View style={styles.fitnessAssignedHeaderRow}>
                          <View style={styles.fitnessBadge}>
                            <Text style={styles.fitnessBadgeText}>COACH</Text>
                          </View>
                          <Text style={styles.fitnessAssignedMeta} numberOfLines={1}>
                            {(entry.coachName || 'Coach')}
                            {entry.createdAtLabel ? ` • Assigned ${entry.createdAtLabel}` : ''}
                          </Text>
                        </View>

                        <View style={styles.fitnessDivider} />

                        {entry.drills.slice(0, MAX_DRILLS).map((d, i) => (
                          <View key={i} style={styles.fitnessBulletRow}>
                            <Text style={styles.fitnessBulletDot}>•</Text>
                            <Text style={styles.fitnessBulletText}>
                              {d.drill}
                              {d.reps ? ` — Reps: ${d.reps}` : ''}
                              {d.sets ? `, Sets: ${d.sets}` : ''}
                            </Text>
                          </View>
                        ))}

                        <TouchableOpacity
                          style={[styles.primaryButton, { marginTop: 12 }]}
                          onPress={() => submitAssignedAndAutoComplete(entry)}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.primaryButtonText}>Submit (Auto-complete)</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </>
          ) : null}

          {/* ---------------- Self Performed ---------------- */}
          {tab === 'self' ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Log your training</Text>
              </View>

              <View style={styles.sectionBlock}>
                <View style={styles.toplineSectionCard}>
                  {/* Share toggle */}
                  {preferredCoachId ? (
                    <TouchableOpacity
                      style={styles.fitnessShareRow}
                      onPress={() => setShareToCoach(v => !v)}
                      activeOpacity={0.9}
                    >
                      <View style={[styles.fitnessShareDot, shareToCoach ? styles.fitnessShareDotOn : null]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fitnessShareTitle}>
                          {shareToCoach ? 'Share with coach' : 'Save for self only'}
                        </Text>
                        <Text style={styles.fitnessShareSub}>
                          {shareToCoach ? `Coach: ${preferredCoachName}` : 'This will not be sent to coach.'}
                        </Text>
                      </View>
                      <Text style={styles.fitnessShareAction}>{shareToCoach ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.fitnessInfoBox}>
                  
                    </View>
                  )}

                  {drills.map((d, idx) => (
                    <View key={idx} style={[styles.fitnessFormCard, idx === 0 ? { marginTop: 0 } : null]}>
                      <View style={styles.fitnessFormHeaderRow}>
                        <Text style={styles.fitnessFormTitle}>Drill {idx + 1}</Text>
                        {drills.length > 1 ? (
                          <TouchableOpacity onPress={() => removeDrill(idx)} activeOpacity={0.85}>
                            <Text style={styles.fitnessRemoveText}>Remove</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <Text style={styles.inputLabel}>Drill name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Plank hold"
                        value={d.drill}
                        onChangeText={t => updateDrill(idx, { drill: t })}
                      />

                      <View style={styles.fitnessTwoColRow}>
                        <View style={styles.fitnessCol}>
                          <Text style={styles.inputLabel}>Reps</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="e.g., 10"
                            value={d.reps}
                            onChangeText={t => updateDrill(idx, { reps: t })}
                            keyboardType="number-pad"
                          />
                        </View>

                        <View style={styles.fitnessCol}>
                          <Text style={styles.inputLabel}>Sets</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="e.g., 3"
                            value={d.sets}
                            onChangeText={t => updateDrill(idx, { sets: t })}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>

                      <Text style={styles.inputLabel}>Notes (optional)</Text>
                      <TextInput
                        style={styles.fitnessNotesInput}
                        placeholder="What should you focus on?"
                        value={d.notes}
                        onChangeText={t => updateDrill(idx, { notes: t })}
                        multiline
                      />
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      { marginTop: 14, opacity: drills.length >= MAX_DRILLS ? 0.5 : 1 },
                    ]}
                    onPress={addMoreDrill}
                    disabled={drills.length >= MAX_DRILLS}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.secondaryButtonText}>+ Add more (up to {MAX_DRILLS})</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, { marginTop: 14 }]}
                    onPress={saveSelfPerformed}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.primaryButtonText}>
                      {shareToCoach ? 'Submit to Coach' : 'Save Training'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : null}

          {/* ---------------- History (last 2) ---------------- */}
          <View style={styles.sectionHeaderRow}>
  <Text style={styles.sectionTitle}>History</Text>

  {historyEntries.length > 2 ? (
    <TouchableOpacity
      onPress={() => setHistoryExpanded((v: boolean) => !v)}
      activeOpacity={0.85}
      style={styles.historyToggleBtn}
    >
      <Text style={styles.historyToggleText}>
        {historyExpanded ? 'Show less' : 'Show all'}
      </Text>
    </TouchableOpacity>
  ) : null}
</View>
          {visibleHistory.length === 0 ? (
  <Text style={styles.emptyBody}>No history yet.</Text>
) : (
  visibleHistory.map((h: FitnessEntry) => (
    <View key={h.id} style={styles.fitnessHistoryItem}>
      <View style={styles.fitnessHistoryTopRow}>
        <Text style={styles.fitnessHistoryDate} numberOfLines={1}>
          {h.createdAtLabel || ''}
        </Text>

        <View
          style={[
            styles.fitnessHistoryPill,
            h.source === 'coach'
              ? styles.fitnessHistoryPillCoach
              : styles.fitnessHistoryPillSelf,
          ]}
        >
          <Text style={styles.fitnessHistoryPillText}>
            {h.source === 'coach' ? 'COACH' : (h.sharedToCoach ? 'SHARED' : 'SELF')}
          </Text>
        </View>
      </View>

      <Text style={styles.fitnessHistoryMeta}>
        {h.source === 'coach'
          ? `Coach Assigned • Completed ${h.completedAtLabel || ''}`
          : h.sharedToCoach
            ? `Shared to ${h.coachName || 'Coach'}`
            : 'Self Training'}
      </Text>

      <View style={styles.fitnessDivider} />

      {h.drills.slice(0, MAX_DRILLS).map((d: Drill, i: number) => (
        <View key={i} style={styles.fitnessBulletRow}>
          <Text style={styles.fitnessBulletDot}>•</Text>
          <Text style={styles.fitnessBulletText}>
            {d.drill}
            {d.reps ? ` — Reps: ${d.reps}` : ''}
            {d.sets ? `, Sets: ${d.sets}` : ''}
          </Text>
        </View>
      ))}
    </View>
  ))
)}

          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 20, marginBottom: 30 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryButtonText}>⬅ Return to Player Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}