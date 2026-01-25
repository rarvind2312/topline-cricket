import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

import CoachVideoReviewScreenBody from './CoachVideoReviewScreen.body';

export type CoachVideoReviewProps = NativeStackScreenProps<
  RootStackParamList,
  'CoachVideoReview'
>;

const CoachVideoReviewScreen: React.FC<CoachVideoReviewProps> = (props) => {
  return <CoachVideoReviewScreenBody {...props} />;
};

export default CoachVideoReviewScreen;
