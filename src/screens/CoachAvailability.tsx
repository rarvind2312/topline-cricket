import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import CoachAvailabilityScreenBody from './CoachAvailabilityScreen.body';

export type CoachAvailabilityProps = NativeStackScreenProps<
  RootStackParamList,
  'CoachAvailability'
>;

const CoachAvailabilityScreen: React.FC<CoachAvailabilityProps> = (props) => {
  return <CoachAvailabilityScreenBody {...props} />;
};

export default CoachAvailabilityScreen;