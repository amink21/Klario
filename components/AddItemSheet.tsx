import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import type { LifeItem, Cadence } from '@/lib/types';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  category: z.string().min(1, 'Category required'),
  amountCents: z.union([z.string(), z.number()]).optional(),
  cadence: z.enum(['one_time', 'daily', 'monthly', 'yearly']),
  nextDueISO: z.string().min(1, 'Due date required'),
  dueTime: z.string().optional(),
  remindDaysBefore: z.number().min(0).max(365),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddItemSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  onSubmit: (item: Omit<LifeItem, 'id' | 'status'>) => void;
  editItem?: LifeItem | null;
  onUpdate?: (id: string, patch: Partial<LifeItem>) => void;
  /** Pre-fill title when adding (e.g. from quick-add when parse failed). */
  initialTitle?: string;
  /** Default remind days before for new items (from settings). */
  defaultRemindDaysBefore?: number;
}

export function AddItemSheet({ bottomSheetRef, onSubmit, editItem, onUpdate, initialTitle, defaultRemindDaysBefore = 1 }: AddItemSheetProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      category: '',
      cadence: 'monthly',
      nextDueISO: new Date().toISOString().slice(0, 10),
      dueTime: '',
      remindDaysBefore: defaultRemindDaysBefore,
    },
  });

  React.useEffect(() => {
    if (editItem) {
      reset({
        title: editItem.title,
        category: editItem.category,
        amountCents: editItem.amountCents ?? undefined,
        cadence: editItem.cadence,
        nextDueISO: editItem.nextDueISO,
        dueTime: editItem.dueTime ?? '',
        remindDaysBefore: editItem.remindDaysBefore,
        notes: editItem.notes ?? '',
      });
    } else {
      reset({
        title: initialTitle ?? '',
        category: '',
        amountCents: undefined,
        cadence: 'monthly',
        nextDueISO: new Date().toISOString().slice(0, 10),
        dueTime: '',
        remindDaysBefore: defaultRemindDaysBefore,
        notes: '',
      });
    }
  }, [editItem, initialTitle, defaultRemindDaysBefore, reset]);

  const dueTimeValue = watch('dueTime');
  const hasDueTime = Boolean(dueTimeValue?.trim());

  const normalizeDueTime = (raw: string | undefined): string | undefined => {
    const s = raw?.trim();
    if (!s) return undefined;
    if (/^\d{1,2}:\d{2}$/.test(s)) return s;
    const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (match) {
      let h = parseInt(match[1] ?? '0', 10);
      const m = parseInt(match[2] ?? '0', 10);
      const ampm = (match[3] ?? '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return undefined;
  };

  const onFormSubmit = useCallback(
    (data: FormData) => {
      const amountCents = data.amountCents
        ? Math.round(Number(String(data.amountCents).replace(/[^0-9.-]/g, '')) * 100)
        : undefined;
      const dueTime = normalizeDueTime(data.dueTime);
      if (editItem && onUpdate) {
        onUpdate(editItem.id, {
          title: data.title,
          category: data.category,
          amountCents: amountCents ?? editItem.amountCents,
          cadence: data.cadence as Cadence,
          nextDueISO: data.nextDueISO,
          dueTime: dueTime ?? undefined,
          remindDaysBefore: data.remindDaysBefore,
          notes: data.notes ?? undefined,
        });
      } else {
        onSubmit({
          title: data.title,
          category: data.category,
          amountCents,
          cadence: data.cadence as Cadence,
          nextDueISO: data.nextDueISO,
          dueTime: dueTime ?? undefined,
          remindDaysBefore: data.remindDaysBefore,
          notes: data.notes,
        });
      }
      bottomSheetRef.current?.close();
      reset();
    },
    [editItem, onUpdate, onSubmit, bottomSheetRef, reset]
  );

  const snapPoints = ['90%'];

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
        <Text style={[styles.title, { color: theme.text }]}>
          {editItem ? 'Edit item' : 'Add item'}
        </Text>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}
        >
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.pillBg }]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Car insurance"
                  placeholderTextColor={theme.textTertiary}
                />
                {errors.title && (
                  <Text style={[styles.error, { color: theme.danger }]}>{errors.title.message}</Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.pillBg }]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Insurance"
                  placeholderTextColor={theme.textTertiary}
                />
                {errors.category && (
                  <Text style={[styles.error, { color: theme.danger }]}>{errors.category.message}</Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="amountCents"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Amount (optional)</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.pillBg }]}
                  value={value != null ? (typeof value === 'number' ? String(value / 100) : String(value)) : ''}
                  onChangeText={(t) => onChange(t === '' ? undefined : t)}
                  placeholder="e.g. 125.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="cadence"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Cadence</Text>
                <View style={styles.pills}>
                  {(['one_time', 'daily', 'monthly', 'yearly'] as const).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.pill,
                        { backgroundColor: value === c ? theme.tint : theme.pillBg },
                      ]}
                      onPress={() => onChange(c)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: value === c ? '#fff' : theme.text },
                        ]}
                      >
                        {c.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          />
          <Controller
            control={control}
            name="nextDueISO"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Due date</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.pillBg }]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textTertiary}
                />
                {errors.nextDueISO && (
                  <Text style={[styles.error, { color: theme.danger }]}>{errors.nextDueISO.message}</Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="dueTime"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Time (optional)</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.pillBg }]}
                  value={value ?? ''}
                  onChangeText={(t) => onChange(t.trim() || undefined)}
                  placeholder="e.g. 19:00 or 7pm"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>
            )}
          />
          <Controller
            control={control}
            name="remindDaysBefore"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Remind (days before)</Text>
                <Text style={[styles.hint, { color: theme.textTertiary }]}>
                  {hasDueTime
                    ? "With a time set above, you're reminded 30 min before that time. Days before is used if you remove the time."
                    : 'Notification at 09:00 that many days before the due date.'}
                </Text>
                <View style={styles.pills}>
                  {[0, 3, 7, 14, 30].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.pill,
                        { backgroundColor: value === d ? theme.tint : theme.pillBg },
                      ]}
                      onPress={() => onChange(d)}
                    >
                      <Text
                        style={[styles.pillText, { color: value === d ? '#fff' : theme.text }]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { color: theme.text, backgroundColor: theme.pillBg }]}
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="Notes"
                  placeholderTextColor={theme.textTertiary}
                  multiline
                />
              </View>
            )}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.tint }]}
            onPress={handleSubmit(onFormSubmit)}
          >
            <Text style={styles.buttonText}>{editItem ? 'Save' : 'Add item'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: spacing.xl, letterSpacing: -0.5 },
  form: {},
  field: { marginBottom: spacing.lg },
  label: { fontSize: 13, marginBottom: spacing.xs },
  input: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    fontSize: 16,
  },
  textArea: { minHeight: 80 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  pillText: { fontSize: 14, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: spacing.xs, marginBottom: spacing.sm },
  error: { fontSize: 12, marginTop: spacing.xs },
  button: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
