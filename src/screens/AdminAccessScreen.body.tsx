import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';
import { styles } from '../styles/styles';
import { toplineLogo } from '../constants/assets';
import { useAuth } from '../context/AuthContext';
import { grantAdminByEmail, revokeAdminByEmail } from '../services/admin';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminAccess'>;

export default function AdminAccessScreenBody({ navigation }: Props) {
  const { isAdmin, refreshAccess } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const runAction = async (mode: 'grant' | 'revoke') => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setStatus('Please enter an email.');
      return;
    }
    try {
      setLoading(true);
      setStatus('');
      const res =
        mode === 'grant' ? await grantAdminByEmail(trimmed) : await revokeAdminByEmail(trimmed);
      if (res?.ok) {
        setStatus(`${mode === 'grant' ? 'Granted' : 'Revoked'} admin for ${trimmed}.`);
      } else {
        setStatus('Action failed. Please try again.');
      }
    } catch (e: any) {
      setStatus(e?.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const onRefreshAccess = async () => {
    await refreshAccess();
    setStatus('Access refreshed. If newly granted, you may need to reopen the app.');
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
            <Text style={styles.emptyBody}>
              You do not have admin access.
            </Text>
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
                <Text style={styles.dashboardSectionIcon}>🛡️</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Admin Access</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <Text style={styles.inputLabel}>User email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="name@email.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { flex: 1, marginTop: 0 },
                  loading ? { opacity: 0.6 } : null,
                ]}
                disabled={loading}
                onPress={() => runAction('grant')}
              >
                <Text style={styles.primaryButtonText}>Grant Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { flex: 1, marginTop: 0 },
                  loading ? { opacity: 0.6 } : null,
                ]}
                disabled={loading}
                onPress={() => runAction('revoke')}
              >
                <Text style={styles.secondaryButtonText}>Revoke Admin</Text>
              </TouchableOpacity>
            </View>

            {status ? (
              <Text style={[styles.playerWelcomeSubText, { marginTop: 10 }]}>{status}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 12 }]}
              onPress={onRefreshAccess}
            >
              <Text style={styles.secondaryButtonText}>Refresh Access</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dashboardSectionWrap}>
          <View style={styles.dashboardSectionHeader}>
            <View style={styles.dashboardSectionHeaderLeft}>
              <View style={styles.dashboardSectionIconWrap}>
                <Text style={styles.dashboardSectionIcon}>⚙️</Text>
              </View>
              <Text style={styles.dashboardSectionTitle}>Admin Settings</Text>
            </View>
          </View>
          <View style={styles.dashboardSectionDivider} />

          <View style={styles.toplineSectionCard}>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 4 }]}
              onPress={() => navigation.navigate('AdminOpeningHours')}
            >
              <Text style={styles.secondaryButtonText}>Opening Hours</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 10 }]}
              onPress={() => navigation.navigate('AdminLanes')}
            >
              <Text style={styles.secondaryButtonText}>Lanes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 10 }]}
              onPress={() => navigation.navigate('AdminLaneAvailability')}
            >
              <Text style={styles.secondaryButtonText}>Lane Availability</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 10 }]}
              onPress={() => navigation.navigate('AdminLaneBookings')}
            >
              <Text style={styles.secondaryButtonText}>Lane Bookings</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
