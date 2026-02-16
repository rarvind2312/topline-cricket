import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import AdminLaneAvailabilityScreenBody from './AdminLaneAvailabilityScreen.body';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLaneAvailability'>;

const AdminLaneAvailabilityScreen: React.FC<Props> = (props) => {
  return <AdminLaneAvailabilityScreenBody {...props} />;
};

export default AdminLaneAvailabilityScreen;
