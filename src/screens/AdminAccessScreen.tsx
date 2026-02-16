import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import AdminAccessScreenBody from './AdminAccessScreen.body';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminAccess'>;

const AdminAccessScreen: React.FC<Props> = (props) => {
  return <AdminAccessScreenBody {...props} />;
};

export default AdminAccessScreen;
