import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

import AdminAccessScreen from '../../screens/AdminAccessScreen';
import AdminOpeningHoursScreen from '../../screens/AdminOpeningHoursScreen';
import AdminLanesScreen from '../../screens/AdminLanesScreen';
import AdminLaneAvailabilityScreen from '../../screens/AdminLaneAvailabilityScreen';
import AdminLaneBookingsScreen from '../../screens/AdminLaneBookingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminAccess" component={AdminAccessScreen} />
      <Stack.Screen name="AdminOpeningHours" component={AdminOpeningHoursScreen} />
      <Stack.Screen name="AdminLanes" component={AdminLanesScreen} />
      <Stack.Screen name="AdminLaneAvailability" component={AdminLaneAvailabilityScreen} />
      <Stack.Screen name="AdminLaneBookings" component={AdminLaneBookingsScreen} />
    </Stack.Navigator>
  );
}
