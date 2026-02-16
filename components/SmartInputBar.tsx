import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Keyboard, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';

export type SmartInputContext = 'today' | 'items' | 'money';

const PLACEHOLDERS: Record<SmartInputContext, string> = {
  today: 'Add anything…',
  items: 'Add anything…',
  money: 'Add anything…',
};

interface SmartInputBarProps {
  context: SmartInputContext;
  onSubmit: (text: string) => void | Promise<void>;
  loading?: boolean;
}

export function SmartInputBar({ context, onSubmit, loading = false }: SmartInputBarProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setText('');
    Keyboard.dismiss();
    await onSubmit(trimmed);
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.accentPill ?? theme.pillBg }]}>
      <TextInput
        style={[styles.input, { color: theme.text }]}
        value={text}
        onChangeText={setText}
        placeholder={PLACEHOLDERS[context]}
        placeholderTextColor={theme.textTertiary}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        blurOnSubmit={false}
        editable={!loading}
      />
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: theme.tint }]}
        onPress={handleSubmit}
        disabled={loading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.addBtnLabel}>Add</Text>
        )}
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
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
