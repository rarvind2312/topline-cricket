import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

import CoachFitnessScreenBody from './CoachFitnessScreen.body';

export type CoachFitnessProps = NativeStackScreenProps<
  RootStackParamList,
  'CoachFitness'
>;

const CoachFitnessScreen: React.FC<CoachFitnessProps> = (props) => {
  return <CoachFitnessScreenBody {...props} />;
};

export default CoachFitnessScreen;
