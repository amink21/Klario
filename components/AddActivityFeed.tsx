/**
 * AMY-style feed: shows "Thinking..." while processing, then "Reminder"/"Transaction"/"Both" labels.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { formatCurrency } from '@/lib/currency';

export type AddActivityKind = 'reminder' | 'transaction' | 'both';

export interface AddActivityItem {
  kind: AddActivityKind;
  title: string;
  amountCents?: number;
}

interface AddActivityFeedProps {
  pendingText: string | null;
  lastAdded: AddActivityItem[];
  emptyHint?: string;
}

const KIND_LABELS: Record<AddActivityKind, string> = {
  reminder: 'Reminder',
  transaction: 'Transaction',
  both: 'Reminder + Transaction',
};

export function AddActivityFeed({ pendingText, lastAdded, emptyHint }: AddActivityFeedProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  if (!pendingText && lastAdded.length === 0) return null;

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surface }]}>
      {pendingText && (
        <View style={[styles.row, styles.rowFirst]}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {pendingText}
          </Text>
          <View style={[styles.chip, { backgroundColor: theme.pillBg }]}>
            <ActivityIndicator size="small" color={theme.textTertiary} style={styles.chipSpinner} />
            <Text style={[styles.chipText, { color: theme.textTertiary }]}>Thinking…</Text>
          </View>
        </View>
      )}
      {lastAdded.map((item, i) => (
        <View
          key={`${item.title}-${i}-${item.kind}`}
          style={[
            styles.row,
            (pendingText || i > 0) && [styles.rowNotFirst, { borderTopColor: theme.border }],
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.right}>
            {item.amountCents != null && (
              <Text style={[styles.amount, { color: theme.textSecondary }]}>
                {formatCurrency(item.amountCents)}
              </Text>
            )}
            <View style={[styles.chip, { backgroundColor: theme.accentPill ?? theme.pillBg }]}>
              <Text style={[styles.chipText, { color: theme.tint }]}>
                {KIND_LABELS[item.kind]}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowFirst: {},
  rowNotFirst: { borderTopWidth: 1 },
  title: { flex: 1, fontSize: 16, fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amount: { fontSize: 15, fontWeight: '500' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  chipSpinner: { marginRight: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },
});
