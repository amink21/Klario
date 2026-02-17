import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { SMART_INPUT_CATEGORIES } from '@/lib/ai/schemas';
import { todayISO } from '@/lib/date';
import type { SmartInputParseResult } from '@/lib/ai/schemas';

type ReminderEdit = NonNullable<SmartInputParseResult['reminder']>;
type SpendingEdit = NonNullable<SmartInputParseResult['spending']>;

interface SmartInputReviewSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  parsed: SmartInputParseResult | null;
  defaultRemindDaysBefore: number;
  onConfirm: (payload: {
    parsed: SmartInputParseResult;
    createReminder: boolean;
    createSpending: boolean;
  }) => void;
  onClose: () => void;
}

export function SmartInputReviewSheet({
  bottomSheetRef,
  parsed,
  defaultRemindDaysBefore,
  onConfirm,
  onClose,
}: SmartInputReviewSheetProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const today = todayISO();

  const [createReminder, setCreateReminder] = useState(true);
  const [createSpending, setCreateSpending] = useState(true);
  const [reminder, setReminder] = useState<ReminderEdit | null>(null);
  const [spending, setSpending] = useState<SpendingEdit | null>(null);

  useEffect(() => {
    if (parsed) {
      setCreateReminder(parsed.intent === 'reminder' || parsed.intent === 'both');
      setCreateSpending(parsed.intent === 'spending' || parsed.intent === 'both');
      setReminder(
        parsed.reminder
          ? {
              ...parsed.reminder,
              nextDueISO: parsed.reminder.nextDueISO ?? today,
              cadence: parsed.reminder.cadence ?? 'one_time',
              remindDaysBefore: parsed.reminder.remindDaysBefore ?? defaultRemindDaysBefore,
            }
          : null
      );
      setSpending(
        parsed.spending
          ? {
              ...parsed.spending,
              amountCents: parsed.spending.amountCents ?? 0,
              dateISO: parsed.spending.dateISO ?? today,
              cadence: parsed.spending.cadence ?? 'one_time',
            }
          : null
      );
    }
  }, [parsed, defaultRemindDaysBefore, today]);

  const handleConfirm = () => {
    if (!reminder && !spending) return;
    const out: SmartInputParseResult = {
      intent: parsed?.intent ?? 'unknown',
      reminder: createReminder && reminder ? reminder : null,
      spending: createSpending && spending ? spending : null,
      confidence: parsed?.confidence ?? 0.5,
    };
    onConfirm({
      parsed: out,
      createReminder: createReminder && !!reminder,
      createSpending: createSpending && !!spending && (spending.amountCents ?? 0) > 0,
    });
    bottomSheetRef.current?.close();
    onClose();
  };

  if (!parsed) return null;

  const categoryList = [...SMART_INPUT_CATEGORIES];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['75%']}
      enablePanDownToClose
      onChange={(i) => i === -1 && onClose()}
      backgroundStyle={{ backgroundColor: theme.surfaceElevated ?? theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Review</Text>
        <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
          Edit and choose what to create
        </Text>

        {reminder && (
          <View style={[styles.block, { backgroundColor: theme.pillBg }]}>
            <View style={styles.row}>
              <Text style={[styles.blockTitle, { color: theme.text }]}>Reminder</Text>
              <Switch
                value={createReminder}
                onValueChange={setCreateReminder}
                trackColor={{ false: theme.pillBg, true: theme.tint }}
                thumbColor="#fff"
              />
            </View>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={reminder.title}
              onChangeText={(t) => setReminder((r) => (r ? { ...r, title: t } : null))}
              placeholder="Title"
              placeholderTextColor={theme.textTertiary}
            />
            <View style={styles.chipRow}>
              {categoryList.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    { backgroundColor: reminder.category === c ? theme.tint : theme.pillBg },
                  ]}
                  onPress={() => setReminder((r) => (r ? { ...r, category: c } : null))}
                >
                  <Text style={[styles.chipText, { color: reminder.category === c ? '#fff' : theme.text }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.inputSmall, { color: theme.text, borderColor: theme.border }]}
                value={reminder.nextDueISO ?? ''}
                onChangeText={(t) => setReminder((r) => (r ? { ...r, nextDueISO: t || null } : null))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
              />
              <View style={styles.pills}>
                {(['one_time', 'daily', 'monthly', 'yearly'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.pill, { backgroundColor: reminder.cadence === c ? theme.tint : theme.pillBg }]}
                    onPress={() => setReminder((r) => (r ? { ...r, cadence: c } : null))}
                  >
                    <Text style={[styles.pillText, { color: reminder.cadence === c ? '#fff' : theme.text }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Remind {reminder.remindDaysBefore ?? defaultRemindDaysBefore} days before
            </Text>
          </View>
        )}

        {spending && (
          <View style={[styles.block, { backgroundColor: theme.pillBg }]}>
            <View style={styles.row}>
              <Text style={[styles.blockTitle, { color: theme.text }]}>Spending</Text>
              <Switch
                value={createSpending}
                onValueChange={setCreateSpending}
                trackColor={{ false: theme.pillBg, true: theme.tint }}
                thumbColor="#fff"
              />
            </View>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={spending.title}
              onChangeText={(t) => setSpending((s) => (s ? { ...s, title: t } : null))}
              placeholder="Title"
              placeholderTextColor={theme.textTertiary}
            />
            <View style={styles.chipRow}>
              {categoryList.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, { backgroundColor: spending.category === c ? theme.tint : theme.pillBg }]}
                  onPress={() => setSpending((s) => (s ? { ...s, category: c } : null))}
                >
                  <Text style={[styles.chipText, { color: spending.category === c ? '#fff' : theme.text }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.inputSmall, { color: theme.text, borderColor: theme.border }]}
                value={spending.amountCents != null ? String(spending.amountCents / 100) : ''}
                onChangeText={(t) => {
                  const n = Math.round(parseFloat(t.replace(/[^0-9.]/g, '')) * 100);
                  setSpending((s) => (s ? { ...s, amountCents: isNaN(n) ? 0 : n } : null));
                }}
                placeholder="Amount"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.textTertiary}
              />
              <TextInput
                style={[styles.inputSmall, { color: theme.text, borderColor: theme.border }]}
                value={spending.dateISO ?? ''}
                onChangeText={(t) => setSpending((s) => (s ? { ...s, dateISO: t || null } : null))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
            <View style={styles.pills}>
              {(['one_time', 'daily', 'monthly', 'yearly'] as const).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pill, { backgroundColor: spending.cadence === c ? theme.tint : theme.pillBg }]}
                  onPress={() => setSpending((s) => (s ? { ...s, cadence: c } : null))}
                >
                  <Text style={[styles.pillText, { color: spending.cadence === c ? '#fff' : theme.text }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: theme.tint }]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmBtnText}>Confirm & Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 20, fontWeight: '600', marginBottom: spacing.xs },
  subtitle: { fontSize: 13, marginBottom: spacing.lg },
  block: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  blockTitle: { fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 15,
  },
  inputSmall: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 14,
  },
  label: { fontSize: 12, marginTop: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  chipText: { fontSize: 12, fontWeight: '500' },
  pills: { flexDirection: 'row', gap: spacing.xs },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  pillText: { fontSize: 12, fontWeight: '500' },
  confirmBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.lg,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
