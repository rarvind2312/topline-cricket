import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import { collection, addDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';

import type { LaneType, RootStackParamList } from '../types';
import { db } from '../firebase';
import { styles } from '../styles/styles';
import { toplineLogo } from '../constants/assets';
import { useAuth } from '../context/AuthContext';
import Checkbox from '../components/Checkbox';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLanes'>;

type Lane = {
  id: string;
  laneName: string;
  isActive: boolean;
  sortOrder?: number;
  laneType?: LaneType;
};

export default function AdminLanesScreenBody({ navigation }: Props) {
  const { firebaseUser, isAdmin } = useAuth();
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [laneName, setLaneName] = useState('');
  const [laneType, setLaneType] = useState<LaneType>('short');
  const [loading, setLoading] = useState(false);
  const [editingLaneId, setEditingLaneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingType, setEditingType] = useState<LaneType>('short');

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

  const addLane = async () => {
    const name = laneName.trim();
    if (!name) return;
    if (!firebaseUser?.uid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    try {
      setLoading(true);
      const maxOrder = lanes.reduce((max, l) => Math.max(max, Number(l.sortOrder || 0)), 0);
      await addDoc(collection(db, 'lanes'), {
        laneName: name,
        laneType,
        isActive: true,
        sortOrder: maxOrder + 1,
        updatedAtMs: Date.now(),
        updatedBy: firebaseUser.uid,
      });
      setLaneName('');
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Missing permissions.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLane = async (lane: Lane) => {
    if (!firebaseUser?.uid) return;
    try {
      await updateDoc(doc(db, 'lanes', lane.id), {
        isActive: !lane.isActive,
        updatedAtMs: Date.now(),
        updatedBy: firebaseUser.uid,
      });
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Missing permissions.');
    }
  };

  const startEditLane = (lane: Lane) => {
    setEditingLaneId(lane.id);
    setEditingName(lane.laneName || '');
    setEditingType(lane.laneType || 'short');
  };

  const cancelEditLane = () => {
    setEditingLaneId(null);
    setEditingName('');
  };

  const saveLaneName = async () => {
    if (!firebaseUser?.uid || !editingLaneId) return;
    const name = editingName.trim();
    if (!name) {
      Alert.alert('Invalid name', 'Lane name cannot be empty.');
      return;
    }
    try {
      await updateDoc(doc(db, 'lanes', editingLaneId), {
        laneName: name,
        laneType: editingType,
        updatedAtMs: Date.now(),
        updatedBy: firebaseUser.uid,
      });
      cancelEditLane();
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
                <Text style={styles.dashboardSectionIcon}>🎯</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Lanes</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>Add lane</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Lane name"
              placeholderTextColor="#9ca3af"
              value={laneName}
              onChangeText={setLaneName}
            />
            <Text style={[styles.inputLabel, { marginTop: 8 }]}>Lane type</Text>
            <View style={styles.pickerCard}>
              <Picker selectedValue={laneType} onValueChange={(v) => setLaneType(String(v) as LaneType)}>
                <Picker.Item label="Short (bowling machine)" value="short" />
                <Picker.Item label="Long" value="long" />
              </Picker>
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 10 }, loading ? { opacity: 0.6 } : null]}
              onPress={addLane}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Add Lane</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>📍</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Active Lanes</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            {lanes.length === 0 ? (
              <Text style={styles.emptyBody}>No lanes configured yet.</Text>
            ) : (
              lanes.map((lane) => (
                <View key={lane.id} style={{ marginTop: 12 }}>
                  {editingLaneId === lane.id ? (
                    <>
                      <Text style={styles.inputLabel}>Lane name</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Lane name"
                        placeholderTextColor="#9ca3af"
                        value={editingName}
                        onChangeText={setEditingName}
                      />
                      <Text style={[styles.inputLabel, { marginTop: 8 }]}>Lane type</Text>
                      <View style={styles.pickerCard}>
                        <Picker
                          selectedValue={editingType}
                          onValueChange={(v) => setEditingType(String(v) as LaneType)}
                        >
                          <Picker.Item label="Short (bowling machine)" value="short" />
                          <Picker.Item label="Long" value="long" />
                        </Picker>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                        <TouchableOpacity
                          style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
                          onPress={saveLaneName}
                        >
                          <Text style={styles.primaryButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.secondaryButton, { flex: 1, marginTop: 0 }]}
                          onPress={cancelEditLane}
                        >
                          <Text style={styles.secondaryButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.inputLabel}>{lane.laneName}</Text>
                      <Text style={[styles.playerWelcomeSubText, { marginTop: 2 }]}>
                        {lane.laneType === 'long' ? 'Long lane' : 'Short lane'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                        <TouchableOpacity
                          style={[styles.secondaryButton, { flex: 1 }]}
                          onPress={() => startEditLane(lane)}
                        >
                          <Text style={styles.secondaryButtonText}>Edit Name</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {editingLaneId !== lane.id ? (
                    <View style={{ marginTop: 8 }}>
                      <Checkbox
                        label={lane.isActive ? 'Active' : 'Inactive'}
                        checked={lane.isActive}
                        onToggle={() => toggleLane(lane)}
                      />
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </View>

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
