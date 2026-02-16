import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import CoachBookLanesScreenBody from './CoachBookLanesScreen.body';

export type CoachBookLanesProps = NativeStackScreenProps<RootStackParamList, 'CoachBookLanes'>;

export default function CoachBookLanesScreen(props: CoachBookLanesProps) {
  return <CoachBookLanesScreenBody {...props} />;
}
