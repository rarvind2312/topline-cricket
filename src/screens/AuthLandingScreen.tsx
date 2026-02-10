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
      <View style={styles.authLandingWrap}>
        {/* Header */}
        <View style={styles.authLandingHeader}>
          <View style={styles.authLandingLogoCard}>
            <Image source={toplineLogo} style={styles.authLandingLogo} />
          </View>

        
          <Text style={styles.authLandingSubtitle}>
            Train Smarter. Play Better
          </Text>
        </View>

        {/* CTA Card */}
        <View style={styles.authLandingCtaCard}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.authLandingPrimaryBtn}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.authLandingPrimaryBtnText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.authLandingSecondaryBtn}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.authLandingSecondaryBtnText}>Sign Up</Text>
          </TouchableOpacity>

          <Text style={styles.authLandingFinePrint}>
            By continuing, you agree to our Video & Privacy Terms.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AuthLandingScreen;