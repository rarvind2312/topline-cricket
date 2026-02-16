import React, { useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

import type { RootStackParamList, Role, AppUserProfile } from "../types";
import { auth } from "../firebase";
import { getUserProfile, updateUserProfile } from "../services/userProfile";
import { inferRoleBeforeAdmin, normalizeRole } from "../utils/roles";

import { styles } from "../styles/styles";
import { toplineLogo } from "../constants/assets";

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

// Local role type includes "parent" + "admin" for runtime checks
type ProfileRole = "coach" | "player" | "parent" | "admin";

const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState<Role>("player");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const canLogin = useMemo(() => {
    return email.trim() !== "" && password.trim() !== "" && !loading;
  }, [email, password, loading]);

  const handleForgotPassword = async () => {
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      Alert.alert("Forgot password", "Enter your email first, then tap Forgot Password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, emailTrimmed);
      Alert.alert("Password reset sent", "Check your email for the reset link.");
    } catch (e: any) {
      const msg = e?.message || "Unable to send password reset email.";
      Alert.alert("Failed", msg);
    }
  };

  const handleLogin = async () => {
    if (!canLogin) return;

    try {
      setLoading(true);

      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      const profile = (await getUserProfile(uid)) as AppUserProfile | null;

      if (!profile) {
        Alert.alert(
          "Login failed",
          "User profile not found. Please sign up again or contact admin."
        );
        await auth.signOut();
        return;
      }

      const tokenResult = await cred.user.getIdTokenResult(true).catch(() => null);
      const isAdminClaim = Boolean(tokenResult?.claims?.admin);

      const pr = (normalizeRole(profile.role) || "player") as ProfileRole;
      const isAdminAccount = pr === "admin" || isAdminClaim;
      let roleBeforeAdmin = normalizeRole((profile as any).roleBeforeAdmin) as
        | ProfileRole
        | null;
      if (roleBeforeAdmin === "admin") roleBeforeAdmin = null;

      if (isAdminAccount && !roleBeforeAdmin) {
        const inferred = inferRoleBeforeAdmin(profile);
        roleBeforeAdmin = inferred || (selectedRole === "coach" ? "coach" : "player");
        updateUserProfile(uid, { roleBeforeAdmin }).catch((e) =>
          console.log("Failed to set roleBeforeAdmin:", e)
        );
      }

      const roleForLogin = isAdminAccount
        ? roleBeforeAdmin || inferRoleBeforeAdmin(profile) || "coach"
        : pr;
      const selectedIsCoach = selectedRole === "coach";
      const accountIsCoach = roleForLogin === "coach";

      if (!isAdminAccount && selectedIsCoach !== accountIsCoach) {
        const adminHint =
          pr === "admin"
            ? " If you were granted admin access, please sign in with your original role."
            : "";
        Alert.alert(
          "Role mismatch",
          `This account is registered as ${accountIsCoach ? "Coach" : "Player/Parent"}. Please switch the role and sign in again.${adminHint}`
        );
        await auth.signOut();
        return;
      }

      // ✅ AuthContext + RootNavigator handles routing
    } catch (e: any) {
      const msg =
        e?.code === "auth/invalid-credential"
          ? "Invalid email or password."
          : e?.message || "Unable to sign in.";
      Alert.alert("Sign in failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.authScrollContent}
        >
          {/* Header */}
          <View style={styles.authHeaderRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Logo + tagline */}
          <View style={styles.logoWrapperSmall}>
            <Image source={toplineLogo} style={styles.authLogoSmall} />
          </View>

          <Text style={styles.authTagline}>Train Smarter. Play Better</Text>

          

          <Text style={styles.label}>Login As</Text>

          {/* Role Toggle */}
          <View style={styles.roleToggleRow}>
            <TouchableOpacity
              style={[
                styles.roleTogglePill,
                selectedRole === "player" && styles.roleTogglePillActive,
              ]}
              onPress={() => setSelectedRole("player")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleToggleText,
                  selectedRole === "player" && styles.roleToggleTextActive,
                ]}
              >
                Player / Parent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleTogglePill,
                selectedRole === "coach" && styles.roleTogglePillActive,
              ]}
              onPress={() => setSelectedRole("coach")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleToggleText,
                  selectedRole === "coach" && styles.roleToggleTextActive,
                ]}
              >
                Coach
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            editable={!loading}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            editable={!loading}
            onSubmitEditing={handleLogin}
          />

          <View style={styles.authRowBetween}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.linkButtonText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.primaryButton, (!canLogin || loading) && styles.buttonDisabled]}
            disabled={!canLogin || loading}
            onPress={handleLogin}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Signing in…" : "Sign In"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate("SignUp")}
            disabled={loading}
          >
            <Text style={styles.linkButtonText}>Don’t have an account? Sign up</Text>
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.authBottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignInScreen;
