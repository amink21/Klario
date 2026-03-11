import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { SMART_INPUT_CATEGORIES } from '@/lib/ai/schemas';
import { formatDisplayDate, todayISO, dateToISOString } from '@/lib/date';
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
  const [datePickerTarget, setDatePickerTarget] = useState<'reminder' | 'spending' | null>(null);
  const [datePickerValue, setDatePickerValue] = useState(() => new Date());

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
    <>
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
              <TouchableOpacity
                style={[styles.inputSmall, styles.dateTouch, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => {
                  const iso = reminder.nextDueISO ?? today;
                  setDatePickerValue(new Date(iso + 'T12:00:00'));
                  setDatePickerTarget('reminder');
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: reminder.nextDueISO ? theme.text : theme.textTertiary }}>
                  {reminder.nextDueISO ? formatDisplayDate(reminder.nextDueISO) : 'Tap to pick date'}
                </Text>
              </TouchableOpacity>
              <View style={styles.pills}>
                {(['one_time', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((c) => (
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
              <TouchableOpacity
                style={[styles.inputSmall, styles.dateTouch, { borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => {
                  const iso = spending.dateISO ?? today;
                  setDatePickerValue(new Date(iso + 'T12:00:00'));
                  setDatePickerTarget('spending');
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: spending.dateISO ? theme.text : theme.textTertiary }}>
                  {spending.dateISO ? formatDisplayDate(spending.dateISO) : 'Tap to pick date'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pills}>
              {(['one_time', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((c) => (
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
    {datePickerTarget && Platform.OS === 'android' && (
      <DateTimePicker
        value={datePickerValue}
        mode="date"
        onChange={(event, date) => {
          setDatePickerTarget(null);
          if (event.type !== 'dismissed' && date) {
            const iso = dateToISOString(date);
            if (datePickerTarget === 'reminder') {
              setReminder((r) => (r ? { ...r, nextDueISO: iso } : null));
            } else if (datePickerTarget === 'spending') {
              setSpending((s) => (s ? { ...s, dateISO: iso } : null));
            }
          }
        }}
        textColor="#000000"
      />
    )}
    {datePickerTarget && Platform.OS === 'ios' && (
      <Modal visible transparent animationType="fade">
        <View style={styles.datePickerModalWrap}>
          <Pressable
            style={[styles.datePickerOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
            onPress={() => setDatePickerTarget(null)}
          />
          <View style={[styles.datePickerSheet, { backgroundColor: theme.surfaceElevated ?? theme.surface }]}>
            <View style={[styles.datePickerHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setDatePickerTarget(null)} hitSlop={12}>
                <Text style={[styles.datePickerBtn, { color: theme.textTertiary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.datePickerTitle, { color: theme.text }]}>Pick date</Text>
              <TouchableOpacity
                onPress={() => {
                  const iso = dateToISOString(datePickerValue);
                  if (datePickerTarget === 'reminder') {
                    setReminder((r) => (r ? { ...r, nextDueISO: iso } : null));
                  } else if (datePickerTarget === 'spending') {
                    setSpending((s) => (s ? { ...s, dateISO: iso } : null));
                  }
                  setDatePickerTarget(null);
                }}
                hitSlop={12}
              >
                <Text style={[styles.datePickerBtn, { color: theme.tint }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerWheelWrap}>
              <DateTimePicker
                value={datePickerValue}
                mode="date"
                onChange={(_, d) => d && setDatePickerValue(d)}
                display="spinner"
                textColor="#000000"
              />
            </View>
          </View>
        </View>
      </Modal>
    )}
    </>
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
  dateTouch: { justifyContent: 'center' },
  datePickerModalWrap: { flex: 1, justifyContent: 'flex-end' },
  datePickerOverlay: { flex: 1 },
  datePickerSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  datePickerTitle: { fontSize: 17, fontWeight: '600' },
  datePickerBtn: { fontSize: 17 },
  datePickerWheelWrap: { alignItems: 'center' },
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
