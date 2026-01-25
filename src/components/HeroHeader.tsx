import React from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../styles/styles';

type HeroHeaderProps = {
  initials: string;
  name: string;
  roleLabel?: string;
  tagline?: string;
  logoSource: any;
};

const HeroHeader: React.FC<HeroHeaderProps> = ({
  initials,
  name,
  roleLabel,
  tagline,
  logoSource,
}) => {
  return (
    <View style={styles.heroContainer}>
      <LinearGradient
        colors={['#E10600', '#8B0000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        {/* Avatar + name + logo (same row) */}
        <View style={styles.headerRow}>
          <View style={styles.leftRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.greeting}>Hi,</Text>
              <Text style={styles.name}>{name}</Text>
              {!!roleLabel && <Text style={styles.meta}>{roleLabel}</Text>}
            </View>
          </View>

          {!!logoSource && <Image source={logoSource} style={styles.logo} />}
        </View>

        {!!tagline && <Text style={styles.tagline}>{tagline}</Text>}
      </LinearGradient>
    </View>
  );
};

export default HeroHeader;
