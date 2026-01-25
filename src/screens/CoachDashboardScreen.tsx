import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';
import CoachDashboardScreenBody from './CoachDashboardScreen.body';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachDashboard'>;

const CoachDashboardScreen: React.FC<Props> = ({ navigation }) => {
  return <CoachDashboardScreenBody navigation={navigation} />;
};

export default CoachDashboardScreen;
