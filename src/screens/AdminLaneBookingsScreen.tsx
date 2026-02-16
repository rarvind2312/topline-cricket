import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import AdminLaneBookingsScreenBody from './AdminLaneBookingsScreen.body';

export type AdminLaneBookingsProps = NativeStackScreenProps<RootStackParamList, 'AdminLaneBookings'>;

export default function AdminLaneBookingsScreen(props: AdminLaneBookingsProps) {
  return <AdminLaneBookingsScreenBody {...props} />;
}
