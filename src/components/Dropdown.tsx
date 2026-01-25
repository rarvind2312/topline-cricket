import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/styles';

type DropdownProps = {
  label: string;
  options: string[];
  value: string | null;
  onChange: (val: string) => void;
};

const Dropdown: React.FC<DropdownProps> = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdownSelected} onPress={() => setOpen(prev => !prev)}>
        <Text style={styles.dropdownSelectedText}>{value || 'Select...'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownOptions}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={styles.dropdownOption}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              <Text style={styles.dropdownOptionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default Dropdown;
