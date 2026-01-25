import React from 'react';
import { useAuth } from '../context/AuthContext';
import AuthStack from './stacks/AuthStack';
import PlayerStack from './stacks/PlayerStack';
import CoachStack from './stacks/CoachStack';

const RootNavigator = () => {
  const { firebaseUser, profile, loading } = useAuth();

  if (loading) return null;

  if (!firebaseUser) return <AuthStack />;

  if (!profile) return <AuthStack />;

  // ✅ profile is guaranteed not null here
  const role = profile.role;

  return role === 'coach' ? <CoachStack /> : <PlayerStack />;
};

export default RootNavigator;
