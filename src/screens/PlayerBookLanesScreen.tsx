import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import PlayerBookLanesScreenBody from './PlayerBookLanesScreen.body';

export type PlayerBookLanesProps = NativeStackScreenProps<RootStackParamList, 'PlayerBookLanes'>;

export default function PlayerBookLanesScreen(props: PlayerBookLanesProps) {
  return <PlayerBookLanesScreenBody {...props} />;
}
