import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import AdminLanesScreenBody from './AdminLanesScreen.body';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLanes'>;

const AdminLanesScreen: React.FC<Props> = (props) => {
  return <AdminLanesScreenBody {...props} />;
};

export default AdminLanesScreen;
