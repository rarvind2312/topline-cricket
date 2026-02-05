import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

import PlayerBookSessionScreenBody from './PlayerBookSessions.body'

export type CoachFitnessProps = NativeStackScreenProps<
  RootStackParamList,
  'PlayerBookSessions'
>;

const PlayerBookSessions: React.FC<CoachFitnessProps> = (props) => {
  return <PlayerBookSessionScreenBody {...props} />;
};

export default PlayerBookSessions;
