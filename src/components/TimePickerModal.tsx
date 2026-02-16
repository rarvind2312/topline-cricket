import React from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { styles } from '../styles/styles';

type Props = {
  visible: boolean;
  value: Date;
  title?: string;
  minuteInterval?: number;
  onChange: (event: DateTimePickerEvent, selected?: Date) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function TimePickerModal({
  visible,
  value,
  title = 'Select time',
  minuteInterval = 30,
  onChange,
  onCancel,
  onConfirm,
}: Props) {
  if (!visible) return null;

  if (Platform.OS === 'ios') {
    return (
      <Modal transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 18 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>{title}</Text>
            <DateTimePicker
              value={value}
              mode="time"
              display="spinner"
              minuteInterval={minuteInterval}
              onChange={onChange}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={[styles.secondaryButton, { flex: 1, marginTop: 0 }]} onPress={onCancel}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} onPress={onConfirm}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <DateTimePicker
      value={value}
      mode="time"
      display="default"
      minuteInterval={minuteInterval}
      onChange={onChange}
    />
  );
}
