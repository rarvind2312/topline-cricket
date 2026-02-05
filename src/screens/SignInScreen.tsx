import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { signInWithEmailAndPassword } from "firebase/auth";

import type { RootStackParamList, Role, AppUserProfile } from "../types";
import { auth } from "../firebase";
import { getUserProfile } from "../services/userProfile";

import { styles } from "../styles/styles";
import { toplineLogo } from "../constants/assets";

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

// Local role type that includes "parent" (even if your Role type doesn’t)
type ProfileRole = "coach" | "player" | "parent";

const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState<Role>("player");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canLogin = useMemo(() => {
    return email.trim() !== "" && password.trim() !== "" && !loading;
  }, [email, password, loading]);

  const handleLogin = async () => {
    if (!canLogin) return;

    try {
      setLoading(true);

      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const uid = cred.user.uid;

      const profile = (await getUserProfile(uid)) as AppUserProfile | null;

      // ✅ If profile missing, don’t let app sit in half-logged-in state
      if (!profile) {
        Alert.alert(
          "Login failed",
          "User profile not found. Please sign up again or contact admin."
        );
        await auth.signOut();
        return;
      }

      // ✅ Role mismatch check (supports parent)
      const pr = (profile.role as ProfileRole) || "player";

      const selectedIsCoach = selectedRole === "coach";
      const accountIsCoach = pr === "coach";

      if (selectedIsCoach !== accountIsCoach) {
        Alert.alert(
          "Role mismatch",
          `This account is registered as ${
            accountIsCoach ? "Coach" : "Player/Parent"
          }. Please switch the role and sign in again.`
        );
        await auth.signOut();
        return;
      }

      // ✅ Nothing else needed: AuthContext + RootNavigator will route correctly
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.formScroll,
          { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "flex-start" }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingVertical: 6, paddingHorizontal: 4 }}
          >
            <Text style={{ fontSize: 18 }}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoWrapperSmall}>
          <Image
            source={toplineLogo}
            style={{ width: 90, height: 90, resizeMode: "contain" }}
          />
        </View>

        <Text style={styles.sectionTitle}>Login</Text>

        <Text style={styles.label}>I am logging in as</Text>

        <View style={styles.roleToggleRow}>
          <TouchableOpacity
            style={[
              styles.roleTogglePill,
              selectedRole === "player" && styles.roleTogglePillActive,
            ]}
            onPress={() => setSelectedRole("player")}
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

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, { marginBottom: 20 }]}
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.primaryButton, (!canLogin || loading) && { opacity: 0.6 }]}
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
        >
          <Text style={styles.linkButtonText}>
            Don’t have an account? Sign up
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignInScreen;