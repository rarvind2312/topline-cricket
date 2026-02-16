import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import AdminOpeningHoursScreenBody from './AdminOpeningHoursScreen.body';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminOpeningHours'>;

const AdminOpeningHoursScreen: React.FC<Props> = (props) => {
  return <AdminOpeningHoursScreenBody {...props} />;
};

export default AdminOpeningHoursScreen;
