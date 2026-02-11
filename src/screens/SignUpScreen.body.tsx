import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createUserWithEmailAndPassword } from 'firebase/auth';

import type { RootStackParamList, Role } from '../types';
import { styles } from '../styles/styles';
import { toplineLogo } from '../constants/assets';

import { auth } from '../firebase';
import { upsertUserProfile } from '../services/userProfile';
import type { AppUserProfile } from '../types';

type SignUpProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

// ✅ Levels (EDIT TEXT HERE if you want different wording)
const PLAYER_LEVELS: string[] = [
  'School / Beginner',
  'Club',
  'Representative',
  'SSV',
  'Craig Shield',
  'Dowling Shield',
  'Premiers',
  'State',

];

const COACH_LEVELS: string[] = [
  'Level 1',
  'Level 2',
  'Level 3',
  'High performance',
  'International',
];

const Checkbox = ({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) => {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center' }}
      activeOpacity={0.85}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: '#666',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 6,
        }}
      >
        {checked ? (
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: '#E10600',
              borderRadius: 2,
            }}
          />
        ) : null}
      </View>

      <Text style={{ fontSize: 15 }}>{label}</Text>
    </TouchableOpacity>
  );
};

function LevelPickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          padding: 18,
        }}
      >
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 10 }}>
            {title}
          </Text>

          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((opt) => {
              const isSelected = opt === selected;
              return (
                <TouchableOpacity
                  key={opt}
                  activeOpacity={0.85}
                  onPress={() => onSelect(opt)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: isSelected ? '#E10600' : '#e5e7eb',
                    backgroundColor: isSelected ? 'rgba(225,6,0,0.06)' : '#fff',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: isSelected ? '700' : '500' }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.linkButton} onPress={onClose}>
            <Text style={styles.linkButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function SignUpScreenBody({ navigation }: SignUpProps) {
  const [loading, setLoading] = useState(false);
const [videoPrivacyAccepted, setVideoPrivacyAccepted] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('player');

  // Common fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Player fields
  const [dob, setDob] = useState(''); // dd/mm/yyyy
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [playerIsBatter, setPlayerIsBatter] = useState(false);
  const [playerIsSpinBowler, setPlayerIsSpinner] = useState(false);
  const [playerIsFastBowler, setPlayerIsFastBowler] = useState(false);
  const [playerIsKeeper, setPlayerIsKeeper] = useState(false);
  const [playerLevel, setPlayerLevel] = useState<string | null>(null);
  const [playCricketUrl, setPlayCricketUrl] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [battingHand, setBattingHand] = useState('');
  const [bowlingHand, setBowlingHand] = useState('');

  // Player picker modal
  const [showPlayerLevelPicker, setShowPlayerLevelPicker] = useState(false);

  // Consent
  const [playerConsentAccepted, setPlayerConsentAccepted] = useState(false);
const [coachConsentAccepted, setCoachConsentAccepted] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasAcceptedConsent, setHasAcceptedConsent] = useState(false);

  // Coach fields
  const [coachPassword, setCoachPassword] = useState('');
  const [coachPasswordAgain, setCoachPasswordAgain] = useState('');
  const [coachBatting, setCoachBatting] = useState(false);
  const [coachFastBowling, setCoachFastBowling] = useState(false);
  const [coachSpinBowling, setCoachSpinBowling] = useState(false);
  const [coachKeeping, setCoachKeeping] = useState(false);
  const [coachLevel, setCoachLevel] = useState<string | null>(null);

  // Coach picker modal
  const [showCoachLevelPicker, setShowCoachLevelPicker] = useState(false);

  const isPlayerRole = selectedRole === 'player';


  const canSignUp = useMemo(() => {
    if (loading) return false;

    if (isPlayerRole) {
      return (
        firstName.trim() &&
        lastName.trim() &&
        email.trim() &&
        dob.trim() &&
        password.length >= 6 &&
        password === passwordAgain
      );
    }

    return (
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      coachPassword.length >= 6 &&
      coachPassword === coachPasswordAgain
    );
  }, [
    loading,
    isPlayerRole,
    firstName,
    lastName,
    email,
    dob,
    password,
    passwordAgain,
    coachPassword,
    coachPasswordAgain,
  ]);
  const isCoachRole = selectedRole === 'coach';
  const isCreateDisabled =
!canSignUp || (isPlayerRole && !hasAcceptedConsent) || (isCoachRole && !hasAcceptedConsent);

  const derivePlayerType = () => {
    let playerType = '';
    const anyBowling = playerIsFastBowler || playerIsSpinBowler;

    if (playerIsBatter && anyBowling) playerType = 'All Rounder';
    else if (playerIsFastBowler && !playerIsSpinBowler) playerType = 'Fast Bowler';
    else if (!playerIsFastBowler && playerIsSpinBowler) playerType = 'Spin Bowler';
    else if (playerIsBatter) playerType = 'Batter';
    else if (playerIsKeeper) playerType = 'Wicket Keeper';

    return playerType;
  };

  const deriveCoachSpecialisation = () => {
    const spec: string[] = [];
    if (coachBatting) spec.push('Batting');
    if (coachFastBowling) spec.push('Fast Bowling');
    if (coachSpinBowling) spec.push('Spin Bowling');
    if (coachKeeping) spec.push('Wicket Keeping');
    return spec;
  };

  const handleSignUp = async () => {
    if (!canSignUp) {
      Alert.alert('Missing details', 'Please fill all required fields correctly.');
      return;
    }

    if (isPlayerRole && !hasAcceptedConsent) {
      Alert.alert('Consent required', 'Please accept the Video & Privacy Terms to continue.');
      return;
    }

    try {
      setLoading(true);

      const emailTrimmed = email.trim();
      const pwd = isPlayerRole ? password : coachPassword;

      const cred = await createUserWithEmailAndPassword(auth, emailTrimmed, pwd);
      const uid = cred.user.uid;
      const nowIso = new Date().toISOString();

      // ✅ Base profile: keep only fields that always exist
      const baseProfile: AppUserProfile = {
        uid,
        role: selectedRole,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailTrimmed,
        isNew: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (selectedRole === 'player') {
        const playerType = derivePlayerType();
        const battingHandNorm = battingHand.trim().toUpperCase();
        const bowlingHandNorm = bowlingHand.trim().toUpperCase();

        const profile: AppUserProfile = {
          ...baseProfile,
          dob: dob.trim(),
          ...(playerType ? { playerType } : {}),
          ...(playerLevel ? { playerLevel } : {}),
          ...(heightCm.trim() ? { heightCm: heightCm.trim() } : {}),
          ...(weightKg.trim() ? { weightKg: weightKg.trim() } : {}),
          ...(battingHandNorm ? { battingHand: battingHandNorm } : {}),
          ...(bowlingHandNorm ? { bowlingHand: bowlingHandNorm } : {}),
          ...(playCricketUrl.trim() ? { playCricketUrl: playCricketUrl.trim() } : {}),
          consents: {
            videoPrivacyAccepted: true,
            acceptedAt: nowIso,
            consentVersion: '2026-01-v1',
          },
        };

        await upsertUserProfile(cred.user.uid,profile);
        return;
      }

      // Coach profile
      const coachSpec = deriveCoachSpecialisation();

      const coachProfile: AppUserProfile = {
        ...baseProfile,
        ...(coachLevel ? { coachLevel } : {}),
        ...(coachSpec.length ? { coachSpecialisation: coachSpec } : {}),
        consents: {
            videoPrivacyAccepted: true,
            acceptedAt: nowIso,
            consentVersion: '2026-01-v1',
          },
      };

      await upsertUserProfile(cred.user.uid,coachProfile);
    } catch (e: any) {
      const msg =
        e?.code === 'auth/email-already-in-use'
          ? 'That email is already in use. Please sign in.'
          : e?.message || 'Unable to create account.';
      Alert.alert('Sign up failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.formScroll}>
        <View style={styles.logoWrapperSmall}>
          <Image source={toplineLogo} style={{ width: 110, height: 110, resizeMode: 'contain' }} />
        </View>

        {/* Role toggle */}
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleChip, selectedRole === 'player' && styles.roleChipSelected]}
            onPress={() => setSelectedRole('player')}
          >
            <Text
              style={[
                styles.roleChipText,
                selectedRole === 'player' && styles.roleChipTextSelected,
              ]}
            >
              Player / Parent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleChip, selectedRole === 'coach' && styles.roleChipSelected]}
            onPress={() => setSelectedRole('coach')}
          >
            <Text
              style={[
                styles.roleChipText,
                selectedRole === 'coach' && styles.roleChipTextSelected,
              ]}
            >
              Coach
            </Text>
          </TouchableOpacity>
        </View>

      
        {/* Common fields */}
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#9ca3af"
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#9ca3af"
          value={lastName}
          onChangeText={setLastName}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#9ca3af"
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />

        {/* Player fields */}
        {selectedRole === 'player' ? (
          <>
            <Text style={styles.label}>Date of Birth (dd/mm/yyyy)</Text>
            <TextInput
              style={styles.input}
              placeholder="dd/mm/yyyy"
              placeholderTextColor="#9ca3af"
              value={dob}
              onChangeText={setDob}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor="#9ca3af"
              value={password}
              secureTextEntry
              onChangeText={setPassword}
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#9ca3af"
              value={passwordAgain}
              secureTextEntry
              onChangeText={setPasswordAgain}
            />

            <Text style={styles.label}>Player Type</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ width: '48%' }}>
                <Checkbox
                  label="Batter"
                  checked={playerIsBatter}
                  onToggle={() => setPlayerIsBatter(!playerIsBatter)}
                />
              </View>
              <View style={{ width: '48%' }}>
                <Checkbox
                  label="Wicket Keeper"
                  checked={playerIsKeeper}
                  onToggle={() => setPlayerIsKeeper(!playerIsKeeper)}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ width: '48%' }}>
                <Checkbox
                  label="Spin Bowler"
                  checked={playerIsSpinBowler}
                  onToggle={() => setPlayerIsSpinner(!playerIsSpinBowler)}
                />
              </View>
              <View style={{ width: '48%' }}>
                <Checkbox
                  label="Fast Bowler"
                  checked={playerIsFastBowler}
                  onToggle={() => setPlayerIsFastBowler(!playerIsFastBowler)}
                />
              </View>
            </View>

            <Text style={styles.label}>Highest Level of Cricket Played</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowPlayerLevelPicker(true)}
              style={[styles.input, {marginBottom: 10}]}
              
            >
              <Text style={{ color: playerLevel ? '#111' : '#9ca3af', paddingTop: 10 }}>
                {playerLevel || 'Select...'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Approx Height (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 170"
              placeholderTextColor="#9ca3af"
              value={heightCm}
              keyboardType="numeric"
              onChangeText={setHeightCm}
            />

            <Text style={styles.label}>Approx Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 65"
              placeholderTextColor="#9ca3af"
              value={weightKg}
              keyboardType="numeric"
              onChangeText={setWeightKg}
            />

            <Text style={styles.label}>Batting Hand (RH / LH)</Text>
            <TextInput
              style={styles.input}
              placeholder="RH or LH"
              placeholderTextColor="#9ca3af"
              value={battingHand}
              autoCapitalize="characters"
              maxLength={2}
              onChangeText={setBattingHand}
            />

            <Text style={styles.label}>Bowling Hand (RH / LH)</Text>
            <TextInput
              style={styles.input}
              placeholder="RH or LH"
              placeholderTextColor="#9ca3af"
              value={bowlingHand}
              autoCapitalize="characters"
              maxLength={2}
              onChangeText={setBowlingHand}
            />

            <Text style={styles.label}>PlayCricket Profile Link (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://play.cricket.com.au/player/..."
              placeholderTextColor="#9ca3af"
              value={playCricketUrl}
              autoCapitalize="none"
              onChangeText={setPlayCricketUrl}
            />

            <TouchableOpacity style={styles.linkButton} onPress={() => setShowConsentModal(true)}>
              <Text style={styles.linkButtonText}>
                By creating an account, you agree to Topline Cricket’s{' '}
                <Text style={{ fontWeight: '700' }}>Video & Privacy Terms</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Coach fields */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor="#9ca3af"
              value={coachPassword}
              secureTextEntry
              onChangeText={setCoachPassword}
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#9ca3af"
              value={coachPasswordAgain}
              secureTextEntry
              onChangeText={setCoachPasswordAgain}
            />

            <Text style={styles.label}>Specialisation</Text>
            <View style={{ marginBottom: 14 }}>
              <Checkbox label="Batting" checked={coachBatting} onToggle={() => setCoachBatting(!coachBatting)} />
              <View style={{ height: 10 }} />
              <Checkbox
                label="Fast Bowling"
                checked={coachFastBowling}
                onToggle={() => setCoachFastBowling(!coachFastBowling)}
              />
              <View style={{ height: 10 }} />
              <Checkbox
                label="Spin Bowling"
                checked={coachSpinBowling}
                onToggle={() => setCoachSpinBowling(!coachSpinBowling)}
              />
              <View style={{ height: 10 }} />
              <Checkbox
                label="Wicket Keeping"
                checked={coachKeeping}
                onToggle={() => setCoachKeeping(!coachKeeping)}
              />
            </View>

            <Text style={styles.label}>Coach Level</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowCoachLevelPicker(true)}
              style={[styles.input, {marginBottom: 20}]}
            >
              <Text style={{ color: coachLevel ? '#111' : '#9ca3af', paddingTop: 10 }}>
                {coachLevel || 'Select...'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => setShowConsentModal(true)}>
              <Text style={styles.linkButtonText}>
                By creating an account, you agree to Topline Cricket’s{' '}
                <Text style={{ fontWeight: '700' }}>Video & Privacy Terms</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, isCreateDisabled && { opacity: 0.6 }]}
          disabled={isCreateDisabled}
          onPress={handleSignUp}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Creating…' : 'Create Account'}</Text>
        </TouchableOpacity>


        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.linkButtonText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
     {/* Consent modal */}
<Modal visible={showConsentModal} animationType="slide" transparent>
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 }}>
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '80%' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 10 }}>
        Video & Privacy Terms
      </Text>

      <ScrollView
        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14 }}
        contentContainerStyle={{ paddingBottom: 10 }}
        showsVerticalScrollIndicator
      >
        <Text style={{ fontSize: 14, lineHeight: 20 }}>
          {`• Player videos may include children/minors.
• Videos are visible only inside the Topline Cricket app to the assigned coach and the player/parent.
• The app does not provide a download option.
• Users must not screen-record or share videos externally.
• Coaches will use videos only for coaching feedback.
• Topline Cricket may store videos securely for coaching history and progress tracking.
• You can request deletion of your content (subject to coaching record needs).

By tapping "I Accept", you confirm you have permission to upload the video(s) and agree to these terms.`}
        </Text>
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryButton, { marginBottom: 10 }]}
        onPress={() => {
          setHasAcceptedConsent(true);
          setShowConsentModal(false);
        }}
      >
        <Text style={styles.primaryButtonText}>I Accept</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setShowConsentModal(false)}
      >
        <Text style={styles.linkButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


      </ScrollView>

      {/* Player Level Modal */}
      <LevelPickerModal
        visible={showPlayerLevelPicker}
        title="Select Player Level"
        options={PLAYER_LEVELS}
        selected={playerLevel}
        onSelect={(v) => {
          setPlayerLevel(v);
          setShowPlayerLevelPicker(false);
        }}
        onClose={() => setShowPlayerLevelPicker(false)}
      />

      {/* Coach Level Modal */}
      <LevelPickerModal
        visible={showCoachLevelPicker}
        title="Select Coach Level"
        options={COACH_LEVELS}
        selected={coachLevel}
        onSelect={(v) => {
          setCoachLevel(v);
          setShowCoachLevelPicker(false);
        }}
        onClose={() => setShowCoachLevelPicker(false)}
      />

      
    </SafeAreaView>
  );
}
