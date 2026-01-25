import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import SignUpScreenBody from './SignUpScreen.body';

export type SignUpProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen(props: SignUpProps) {
  return <SignUpScreenBody {...props} />;
}