import React from 'react';
import { SafeAreaView, View, TouchableOpacity, Text, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { styles } from '../styles/styles';

import { toplineLogo } from '../constants/assets';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthLanding'>;

const AuthLandingScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.authContainer}>
      <View style={styles.logoWrapper}>
        <Image source={toplineLogo} style={{ width: 180, height: 180, resizeMode: 'contain' }} />
      </View>

      <View style={styles.authButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.primaryButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.secondaryButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AuthLandingScreen;
