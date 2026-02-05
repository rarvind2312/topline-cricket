import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

import CoachBookingRequestsScreenBody from './CoachBookingRequest.body';

export type CoachBookingRequestsProps = NativeStackScreenProps<
  RootStackParamList,
  'CoachBookingRequests'
>;

const CoachBookingRequestsScreen: React.FC<CoachBookingRequestsProps> = (props) => {
  return <CoachBookingRequestsScreenBody {...props} />;
};

export default CoachBookingRequestsScreen;