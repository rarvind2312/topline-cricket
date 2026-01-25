import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';
import PlayerFitnessScreenBody from './PlayerFitnessScreen.body';

export type PlayerFitnessProps = NativeStackScreenProps<
  RootStackParamList,
  'PlayerFitness'
>;

const PlayerFitnessScreen: React.FC<PlayerFitnessProps> = (props) => {
  return <PlayerFitnessScreenBody {...props} />;
};

export default PlayerFitnessScreen;
