import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ title, value, subtitle, style }: StatCardProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }, style]}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      {subtitle != null && (
        <Text style={[styles.subtitle, { color: theme.textTertiary }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
