import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { formatCurrency } from '@/lib/currency';
import { formatRelativeDate, formatTimeHHMM } from '@/lib/date';
import type { LifeItem } from '@/lib/types';

interface ItemDetailsSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  item: LifeItem | null;
  onEdit: () => void;
  onMarkRenewed: () => void;
  onCancel: () => void;
}

export function ItemDetailsSheet({
  bottomSheetRef,
  item,
  onEdit,
  onMarkRenewed,
  onCancel,
}: ItemDetailsSheetProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  if (!item) return null;

  const snapPoints = ['50%'];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.surfaceElevated ?? theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {item.category} · {item.cadence.replace('_', ' ')}
        </Text>
        {item.amountCents != null && (
          <Text style={[styles.amount, { color: theme.text }]}>{formatCurrency(item.amountCents)}</Text>
        )}
        <Text style={[styles.due, { color: theme.textSecondary }]}>
          Due {formatRelativeDate(item.nextDueISO)}
          {item.dueTime ? ` at ${formatTimeHHMM(item.dueTime)}` : ''}
        </Text>
        {item.notes ? (
          <Text style={[styles.notes, { color: theme.textSecondary }]}>{item.notes}</Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.tint }]}
            onPress={() => {
              onEdit();
              bottomSheetRef.current?.close();
            }}
          >
            <Text style={styles.btnTextWhite}>Edit</Text>
          </TouchableOpacity>
          {item.status === 'active' && item.cadence !== 'one_time' && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.pillBg }]}
              onPress={() => {
                onMarkRenewed();
                bottomSheetRef.current?.close();
              }}
            >
              <Text style={[styles.btnText, { color: theme.tint }]}>Mark renewed</Text>
            </TouchableOpacity>
          )}
          {item.status === 'active' && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.chipAction }]}
              onPress={() => {
                onCancel();
                bottomSheetRef.current?.close();
              }}
            >
              <Text style={[styles.btnText, { color: theme.danger }]}>Cancel item</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: spacing.xs, letterSpacing: -0.5 },
  meta: { fontSize: 14, marginBottom: spacing.sm },
  amount: { fontSize: 18, fontWeight: '600', marginBottom: spacing.xs },
  due: { fontSize: 14, marginBottom: spacing.lg },
  notes: { fontSize: 14, marginBottom: spacing.lg },
  actions: { gap: spacing.sm },
  btn: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '600' },
  btnTextWhite: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
