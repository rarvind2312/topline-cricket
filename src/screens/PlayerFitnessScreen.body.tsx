import React, { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { styles } from '../styles/styles';
import type { PlayerFitnessProps } from './PlayerFitnessScreen';
import type { FitnessEntry } from '../types';
const MAX_SETS = 50;
const MAX_REPS = 500;


const PlayerFitnessScreenBody: React.FC<PlayerFitnessProps> = ({ navigation }) => {
  const [description, setDescription] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [entries, setEntries] = useState<FitnessEntry[]>([]);

  const handleAddEntry = () => {
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

    const now = Date.now();
    const today = new Date();
    const dateKey = today.toISOString().slice(0, 10);
    const dateLabel = today.toLocaleDateString();

    const newEntry: FitnessEntry = {
      id: `${now}`,
      createdAt: now,
      dateKey,
      dateLabel,
      description: trimmedDesc,
      sets: setsNum,
      reps: repsNum,
    };

    setEntries(prev => [newEntry, ...prev]);
    setDescription('');
    setSets('');
    setReps('');
  };

  // group entries by dateKey
  const entriesByDate = useMemo(() => {
    const map: Record<string, FitnessEntry[]> = {};
    for (const e of entries) {
      if (!map[e.dateKey]) map[e.dateKey] = [];
      map[e.dateKey].push(e);
    }
    // newest first within day
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => b.createdAt - a.createdAt);
    });
    return map;
  }, [entries]);

  const orderedDates = useMemo(() => {
    // sort newest day first
    return Object.keys(entriesByDate).sort((a, b) => (a < b ? 1 : -1));
  }, [entriesByDate]);

  // summary
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

        <Text style={styles.playerWelcomeSubText}>
          Log your basic fitness work: exercise name, sets and reps.
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
                {badges.map(badge => (
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

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 12 }]}
            onPress={handleAddEntry}
          >
            <Text style={styles.primaryButtonText}>Save fitness set</Text>
          </TouchableOpacity>
        </View>

        {/* Recent sessions */}
        {orderedDates.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
              Recent sessions
            </Text>

            {orderedDates.map(dateKey => {
              const dayEntries = entriesByDate[dateKey];
              const dateLabel = dayEntries?.[0]?.dateLabel ?? dateKey;

              return (
                <View key={dateKey} style={styles.playerCard}>
                  <Text style={styles.playerCardTitle}>{dateLabel}</Text>

                  <View style={styles.fitnessTableHeaderRow}>
                    <Text style={[styles.fitnessTableHeader, { flex: 2 }]}>
                      Exercise
                    </Text>
                    <Text style={[styles.fitnessTableHeader, { flex: 1, textAlign: 'center' }]}>
                      Sets
                    </Text>
                    <Text style={[styles.fitnessTableHeader, { flex: 1, textAlign: 'center' }]}>
                      Reps
                    </Text>
                  </View>

                  {dayEntries.map(entry => (
                    <View key={entry.id} style={styles.fitnessTableRow}>
                      <Text
                        style={[styles.fitnessTableCellText, { flex: 2 }]}
                        numberOfLines={1}
                      >
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
