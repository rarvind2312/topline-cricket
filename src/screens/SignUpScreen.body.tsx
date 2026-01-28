// src/screens/SignUpScreen.body.tsx
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';
import { styles } from '../styles/styles';
import { signUpWithEmail } from '../services/authServices';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const PLAYER_LEVELS = [
  { label: 'Select level…', value: '' },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Elite', value: 'elite' },
];

const COACH_LEVELS = [
  { label: 'Select level…', value: '' },
  { label: 'Junior Coach', value: 'junior' },
  { label: 'Club Coach', value: 'club' },
  { label: 'Representative Coach', value: 'rep' },
  { label: 'High Performance', value: 'hp' },
];

export default function SignUpScreen({ navigation }: Props) {
  const [role, setRole] = useState<'player' | 'coach'>('player');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Player-only fields
  const [playerLevel, setPlayerLevel] = useState('');

  // Coach-only fields
  const [coachLevel, setCoachLevel] = useState('');
  const [coachSpecialisation, setCoachSpecialisation] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Consent (player + coach)
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [acceptedConsents, setAcceptedConsents] = useState(false);
  const [acceptedConsentsCoach, setAcceptedConsentsCoach] = useState(false);

  const consentText = useMemo(() => {
    if (role === 'coach') {
      return {
        title: 'Coach Consent',
        bullets: [
          'I will provide respectful and appropriate guidance to players.',
          'I understand I must not request or store sensitive personal information from players.',
          'I understand inappropriate behaviour may lead to account removal.',
        ],
        checkbox: 'I agree to the Coach Consent terms above.',
      };
    }

    return {
      title: 'Player Consent',
      bullets: [
        'I will upload only cricket-related content and training videos.',
        'I understand inappropriate content may lead to account removal.',
        'I understand coaches may review my videos and provide feedback.',
      ],
      checkbox: 'I agree to the Player Consent terms above.',
    };
  }, [role]);

  const onSignUp = async () => {
    setError('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (role === 'player' && !playerLevel) {
      setError('Please select your player level.');
      return;
    }

    if (role === 'coach' && !coachLevel) {
      setError('Please select your coaching level.');
      return;
    }

    // ✅ Consent must be accepted (player + coach)
    if (role === 'player' && !acceptedConsents) {
      setError('Please accept Player Consent to continue.');
      return;
    }
    if (role === 'coach' && !acceptedConsentsCoach) {
      setError('Please accept Coach Consent to continue.');
      return;
    }

    try {
      setLoading(true);

      await signUpWithEmail ({email: email.trim().toLowerCase(), password,role,firstName:firstName.trim(),lastName:lastName.trim()});
      

      Alert.alert('Success', 'Account created successfully.');

      // RootNavigator will route based on profile.role (don’t navigate manually)
    } catch (e: any) {
      setError(e?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const isConsentAccepted = role === 'coach' ? acceptedConsentsCoach : acceptedConsents;

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Sign Up</Text>
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {/* Role picker (keep) */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>I am a</Text>
            <View style={styles.pickerCard}>
              <Picker selectedValue={role} onValueChange={(v) => setRole(v)}>
                <Picker.Item label="Player" value="player" />
                <Picker.Item label="Coach" value="coach" />
              </Picker>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              editable={!loading}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              editable={!loading}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* ✅ RESTORE Player level + Coach level pickers (no UX changes beyond bringing them back) */}
          {role === 'player' ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Player level</Text>
              <View style={styles.pickerCard}>
                <Picker selectedValue={playerLevel} onValueChange={(v) => setPlayerLevel(String(v))}>
                  {PLAYER_LEVELS.map((x) => (
                    <Picker.Item key={x.value || x.label} label={x.label} value={x.value} />
                  ))}
                </Picker>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Coaching level</Text>
                <View style={styles.pickerCard}>
                  <Picker selectedValue={coachLevel} onValueChange={(v) => setCoachLevel(String(v))}>
                    {COACH_LEVELS.map((x) => (
                      <Picker.Item key={x.value || x.label} label={x.label} value={x.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Specialisation</Text>
                <TextInput
                  style={styles.input}
                  value={coachSpecialisation}
                  onChangeText={setCoachSpecialisation}
                  placeholder="Batting / Bowling / Fielding"
                  editable={!loading}
                />
              </View>
            </>
          )}

          {/* Consent trigger (keep UX same – just consent patch) */}
          <TouchableOpacity
            style={styles.consentButton}
            onPress={() => setConsentModalVisible(true)}
            disabled={loading}
          >
            <Text style={styles.consentButtonText}>
              {isConsentAccepted ? '✅ Consent accepted' : 'View & Accept Consent'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={onSignUp} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Creating…' : 'Create account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('SignIn')}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Consent modal (consent-only patch; no UX change) */}
        <Modal visible={consentModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{consentText.title}</Text>

                <Pressable
                  onPress={() => setConsentModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              <Text style={styles.sectionSubtitle}>
                Please read and accept before continuing.
              </Text>

              <View style={{ marginTop: 10 }}>
                {consentText.bullets.map((b, idx) => (
                  <View key={`${idx}-${b}`} style={styles.modalBulletRow}>
                    <Text style={styles.modalBullet}>•</Text>
                    <Text style={styles.modalBulletText}>{b}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (role === 'coach') setAcceptedConsentsCoach((p) => !p);
                  else setAcceptedConsents((p) => !p);
                }}
                style={{ marginTop: 14 }}
              >
                <Text style={styles.playerWelcomeSubText}>
                  {isConsentAccepted ? '☑ ' : '☐ '}
                  {consentText.checkbox}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 16 }]}
                onPress={() => {
                  // must be accepted to close
                  if (!isConsentAccepted) {
                    Alert.alert('Consent required', 'Please accept consent to continue.');
                    return;
                  }
                  setConsentModalVisible(false);
                }}
              >
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Styles patch ONLY (missing keys) – does not change your existing UX/styles,
 * just prevents TS/runtime style errors if these were referenced.
 *
 * Add these into your existing styles/styles.ts (or wherever `styles` is defined)
 * ONLY if you don’t already have them.
 *
 * NOTE: If your styles already include these keys, ignore this block.
 */
export const __SIGNUP_MISSING_STYLE_KEYS__ = {
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoSmall: { width: 34, height: 34, resizeMode: 'contain' },

  pickerButton: { paddingVertical: 12 },

  sectionSubtitle: { marginTop: 6, opacity: 0.85 },

  modalBullet: { marginRight: 10 },
};
