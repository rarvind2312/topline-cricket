import React from 'react';
import { useAuth } from '../context/AuthContext';
import { normalizeRole } from '../utils/roles';
import AuthStack from './stacks/AuthStack';
import PlayerStack from './stacks/PlayerStack';
import CoachStack from './stacks/CoachStack';
import AdminStack from './stacks/AdminStack';

const RootNavigator = () => {
  const { firebaseUser, profile, loading, isAdmin } = useAuth();

  if (loading) return null;

  if (!firebaseUser) return <AuthStack />;

  if (!profile) return <AuthStack />;

  // ✅ profile is guaranteed not null here
  const profileRole = normalizeRole(profile.role) || "player";
  if (isAdmin) {
    return <AdminStack />;
  }

  return profileRole === 'coach' ? <CoachStack /> : <PlayerStack />;
};

export default RootNavigator;
