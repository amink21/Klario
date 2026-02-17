import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { formatDueIn, daysUntil, formatTimeHHMM, getDueTimestamp } from '@/lib/date';
import { formatCurrency } from '@/lib/currency';
import type { LifeItem } from '@/lib/types';

interface UpcomingListProps {
  items: LifeItem[];
  limit?: number;
  /** 0 = today only, 7/14/30 = within that many days. Default 14. */
  withinDays?: number;
  onItemPress?: (item: LifeItem) => void;
}

export function UpcomingList({ items, limit = 5, withinDays = 14, onItemPress }: UpcomingListProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const sorted = [...items]
    .filter((i) => {
      if (i.status !== 'active') return false;
      const d = daysUntil(i.nextDueISO);
      if (withinDays === 0) return d === 0;
      return d >= 0 && d <= withinDays;
    })
    .sort((a, b) => getDueTimestamp(a.nextDueISO, a.dueTime) - getDueTimestamp(b.nextDueISO, b.dueTime))
    .slice(0, limit);

  // Dedupe by id so we never render duplicate keys (e.g. from store glitches)
  const seen = new Set<string>();
  const deduped = sorted.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surface }]}>
      {deduped.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textTertiary }]}>
          {withinDays === 0 ? 'Nothing due today' : 'Nothing due soon'}
        </Text>
      ) : (
        deduped.map((item, index) => (
          <TouchableOpacity
            key={`${item.id}-${index}`}
            style={[styles.row, index > 0 && [styles.rowNotFirst, { borderTopColor: theme.border }]]}
            onPress={() => onItemPress?.(item)}
            activeOpacity={0.6}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.dueIn, { color: theme.textTertiary }]}>
                {formatDueIn(item.nextDueISO, item.dueTime)}
                {item.dueTime ? ` at ${formatTimeHHMM(item.dueTime)}` : ''}
              </Text>
            </View>
            {item.amountCents != null && (
              <Text style={[styles.amount, { color: theme.textSecondary }]}>
                {formatCurrency(item.amountCents)}
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
  },
  empty: {
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowNotFirst: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  rowLeft: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '500', letterSpacing: -0.3 },
  dueIn: { fontSize: 13, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '500' },
});
