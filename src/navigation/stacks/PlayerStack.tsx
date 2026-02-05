import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

import PlayerDashboardScreen from '../../screens/PlayerDashboardScreen';
import PlayerVideosScreen from '../../screens/PlayerVideosScreen';
import PlayerFitnessScreen from '../../screens/PlayerFitnessScreen';
import PlayerBookSessions from '../../screens/PlayerBookSessions';
import PlayerBookSessionScreenBody from '../../screens/PlayerBookSessions.body';
import PlayerCoachingVideosScreenBody from '../../screens/PlayerCoachingVideosScreen.body';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function PlayerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlayerDashboard" component={PlayerDashboardScreen} />
      <Stack.Screen name="PlayerVideos" component={PlayerVideosScreen} />
      <Stack.Screen name="PlayerFitness" component={PlayerFitnessScreen} />
          <Stack.Screen name="PlayerBookSessions" component={PlayerBookSessionScreenBody} />
          <Stack.Screen name="PlayerCoachingVideos" component={PlayerCoachingVideosScreenBody} />
    </Stack.Navigator>
  );
}
