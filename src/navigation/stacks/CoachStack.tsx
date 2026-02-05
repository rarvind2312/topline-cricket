import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

import CoachDashboardScreen from '../../screens/CoachDashboardScreen';
import CoachVideoReviewScreen from '../../screens/CoachVideoReviewScreen';
import CoachFitnessScreen from '../../screens/CoachFitnessScreen';
import CoachAvailabilityScreen from '../../screens/CoachAvailability';
import CoachBookingRequestsScreen from '../../screens/CoachBookingRequest';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function CoachStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CoachDashboard" component={CoachDashboardScreen} />
      <Stack.Screen name="CoachVideoReview" component={CoachVideoReviewScreen} />
      <Stack.Screen name="CoachFitness" component={CoachFitnessScreen} />
     <Stack.Screen name="CoachAvailability" component={CoachAvailabilityScreen} />
     <Stack.Screen name="CoachBookingRequests" component={CoachBookingRequestsScreen} />
    </Stack.Navigator>
  );   
}
