import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { styles } from '../styles/styles';

type CheckboxProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onToggle }) => {
  return (
    <TouchableOpacity style={styles.checkboxRow} onPress={onToggle}>
      <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
        {checked && <Text style={styles.checkboxTick}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

export default Checkbox;
