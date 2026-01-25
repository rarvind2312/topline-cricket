import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

import CoachDashboardScreen from '../../screens/CoachDashboardScreen';
import CoachVideoReviewScreen from '../../screens/CoachVideoReviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function CoachStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CoachDashboard" component={CoachDashboardScreen} />
      <Stack.Screen name="CoachVideoReview" component={CoachVideoReviewScreen} />
    </Stack.Navigator>
  );
}
