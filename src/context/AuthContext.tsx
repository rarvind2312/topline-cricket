// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import type { AppUserProfile, User } from '../types';
import { getUserProfile, upsertUserProfile } from '../services/userProfile';
import { logoutAuth } from '../services/authServices';

type AuthContextType = {
  firebaseUser: FirebaseUser | null;
  profile: AppUserProfile | null;

  // Backward-compatible aliases (so your screens using user/setUser don’t explode)
  user: AppUserProfile | null;
  setUser: (u: User | null) => Promise<void>;

  loading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }
    const p = await getUserProfile(firebaseUser.uid);
    setProfile(p);
  };

  // Backward compatible: setUser(User|null)
  // - If logged in: merges into existing profile and persists to Firestore
  // - If null: clears local profile
  const setUser = async (u: User | null) => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }
    if (!u) {
      setProfile(null);
      return;
    }

    const nowIso = new Date().toISOString();
    const base: AppUserProfile = profile ?? {
      uid: firebaseUser.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
      // fallback required fields if profile was missing
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
    };

    const merged: AppUserProfile = {
      ...base,
      ...u,
      uid: firebaseUser.uid,
      createdAt: base.createdAt,
      updatedAt: nowIso,
    };

    setProfile(merged);
    await upsertUserProfile(firebaseUser.uid,merged);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);

      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const p = await getUserProfile(u.uid);
      setProfile(p);
      setLoading(false);
    });

    return unsub;
  }, []);

  const logout = async () => {
    await logoutAuth();
  };

  const value = useMemo<AuthContextType>(
    () => ({
      firebaseUser,
      profile,
      user: profile,
      setUser,
      loading,
      refreshProfile,
      logout,
    }),
    [firebaseUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
