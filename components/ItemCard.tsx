import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { formatDueIn, formatTimeHHMM } from '@/lib/date';
import { formatCurrency } from '@/lib/currency';
import type { LifeItem } from '@/lib/types';

interface ItemCardProps {
  item: LifeItem;
  onPress: () => void;
}

export function ItemCard({ item, onPress }: ItemCardProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const isCancelled = item.status === 'cancelled';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.surface },
        isCancelled && { opacity: 0.7 },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.meta, { color: theme.textTertiary }]}>
            {item.category} · {formatDueIn(item.nextDueISO, item.dueTime)}
            {item.dueTime ? ` at ${formatTimeHHMM(item.dueTime)}` : ''}
            {item.amountCents != null && ` · ${formatCurrency(item.amountCents)}`}
          </Text>
        </View>
        {isCancelled && (
          <View style={[styles.chip, { backgroundColor: theme.pillBg }]}>
            <Text style={[styles.chipText, { color: theme.textSecondary }]}>Cancelled</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  main: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  meta: { fontSize: 13, marginTop: 4 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  chipText: { fontSize: 12, fontWeight: '500' },
});
