import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
  /** When provided, shows a check circle to mark the reminder as done. */
  onMarkDone?: (item: LifeItem) => void;
  /** When provided, completed items show green check + Done and tapping calls this to mark undone. */
  onMarkUndone?: (item: LifeItem) => void;
}

export function UpcomingList({ items, limit = 5, withinDays = 14, onItemPress, onMarkDone, onMarkUndone }: UpcomingListProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const showCheckToggle = (onMarkDone != null) || (onMarkUndone != null);
  const sorted = [...items]
    .filter((i) => {
      if (i.status !== 'active' && i.status !== 'completed') return false;
      const d = daysUntil(i.nextDueISO);
      if (withinDays === 0) return d === 0;
      return d >= 0 && d <= withinDays;
    })
    .sort((a, b) => getDueTimestamp(a.nextDueISO, a.dueTime) - getDueTimestamp(b.nextDueISO, b.dueTime))
    .slice(0, limit);

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
        deduped.map((item, index) => {
          const isCompleted = item.status === 'completed';
          const onCheckPress = isCompleted ? onMarkUndone : onMarkDone;
          return (
            <View
              key={`${item.id}-${index}`}
              style={[styles.row, index > 0 && [styles.rowNotFirst, { borderTopColor: theme.border }]]}
            >
              {showCheckToggle && onCheckPress && (
                <TouchableOpacity
                  style={[
                    styles.checkWrap,
                    { backgroundColor: isCompleted ? theme.tint : theme.pillBg },
                  ]}
                  onPress={() => onCheckPress(item)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <FontAwesome
                    name="check"
                    size={14}
                    color={isCompleted ? '#fff' : theme.textTertiary}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.rowMain}
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
                <View style={styles.rowRight}>
                  {isCompleted && (
                    <View style={[styles.doneBadge, { backgroundColor: theme.chipStable }]}>
                      <Text style={[styles.doneBadgeText, { color: theme.tint }]}>Done</Text>
                    </View>
                  )}
                  {item.amountCents != null && (
                    <Text style={[styles.amount, { color: theme.textSecondary }]}>
                      {formatCurrency(item.amountCents)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })
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
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowNotFirst: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: { flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { fontSize: 16, fontWeight: '500', letterSpacing: -0.3 },
  dueIn: { fontSize: 13, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '500' },
  doneBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  doneBadgeText: { fontSize: 12, fontWeight: '500' },
});
