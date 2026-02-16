import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Keyboard } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';

interface QuickAddBarProps {
  placeholder?: string;
  onSubmit: (text: string) => void;
}

export function QuickAddBar({
  placeholder = 'e.g. internet bill march 14, monthly',
  onSubmit,
}: QuickAddBarProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
    Keyboard.dismiss();
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.accentPill ?? theme.pillBg }]}>
      <TextInput
        style={[styles.input, { color: theme.text }]}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        blurOnSubmit={false}
        multiline={false}
      />
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: theme.tint }]}
        onPress={handleSubmit}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.addBtnLabel}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  addBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  addBtnLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
