import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { formatDueIn, formatTimeHHMM } from '@/lib/date';
import { formatCurrency } from '@/lib/currency';
import type { LifeItem } from '@/lib/types';

interface ItemCardProps {
  item: LifeItem;
  onPress: () => void;
  /** When provided and item is active, shows a check to mark as done. */
  onMarkDone?: (item: LifeItem) => void;
  /** When provided and item is completed, tapping the green check marks it undone (back to active). */
  onMarkUndone?: (item: LifeItem) => void;
}

export function ItemCard({ item, onPress, onMarkDone, onMarkUndone }: ItemCardProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const isCancelled = item.status === 'cancelled';
  const isCompleted = item.status === 'completed';
  const onCheckPress = isCompleted ? onMarkUndone : onMarkDone;
  const showCheck = (onMarkDone != null || onMarkUndone != null) && onCheckPress != null && (item.status === 'active' || item.status === 'completed');

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }, isCancelled && { opacity: 0.7 }]}>
      {showCheck && (
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
        style={showCheck ? styles.mainTouch : styles.mainTouchFull}
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
          {isCompleted && (
            <View style={[styles.chip, { backgroundColor: theme.chipStable }]}>
              <Text style={[styles.chipText, { color: theme.tint }]}>Done</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  mainTouch: { flex: 1 },
  mainTouchFull: { flex: 1 },
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
