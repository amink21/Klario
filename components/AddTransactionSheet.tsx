import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import type { Transaction } from '@/lib/types';
import { todayISO } from '@/lib/date';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  amountCents: z.union([
    z.string().min(1, 'Amount required'),
    z.number(),
  ]),
  category: z.string().min(1, 'Category required'),
  dateISO: z.string().min(1, 'Date required'),
  merchant: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddTransactionSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
  editTransaction?: Transaction | null;
  onUpdate?: (tx: Transaction) => void;
  onClose?: () => void;
}

export function AddTransactionSheet({ bottomSheetRef, onSubmit, editTransaction, onUpdate, onClose }: AddTransactionSheetProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      amountCents: '',
      category: '',
      dateISO: todayISO(),
      merchant: '',
    },
  });

  useEffect(() => {
    if (editTransaction) {
      reset({
        title: editTransaction.title,
        amountCents: String(Math.abs(editTransaction.amountCents) / 100),
        category: editTransaction.category,
        dateISO: editTransaction.dateISO,
        merchant: editTransaction.merchant ?? '',
      });
    } else {
      reset({
        title: '',
        amountCents: '',
        category: '',
        dateISO: todayISO(),
        merchant: '',
      });
    }
  }, [editTransaction, reset]);

  const onFormSubmit = useCallback(
    (data: FormData) => {
      const rawAmount = Math.round(
        Number(String(data.amountCents).replace(/[^0-9.-]/g, '')) * 100
      );
      const amountCents = rawAmount;
      if (editTransaction && onUpdate) {
        onUpdate({
          ...editTransaction,
          title: data.title,
          amountCents,
          category: data.category,
          dateISO: data.dateISO,
          merchant: data.merchant || undefined,
        });
      } else {
        onSubmit({
          title: data.title,
          amountCents,
          category: data.category,
          dateISO: data.dateISO,
          merchant: data.merchant || undefined,
        });
      }
      bottomSheetRef.current?.close();
      reset({ ...data, title: '', amountCents: '', merchant: '' });
    },
    [onSubmit, onUpdate, editTransaction, bottomSheetRef, reset]
  );

  const snapPoints = ['70%'];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={(i) => i === -1 && onClose?.()}
      backgroundStyle={{ backgroundColor: theme.surfaceElevated ?? theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          {editTransaction ? 'Edit transaction' : 'Add transaction'}
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
                  placeholder="e.g. Groceries"
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
            name="amountCents"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.pillBg }]}
                  value={value != null ? String(value) : ''}
                  onChangeText={onChange}
                  placeholder="e.g. 45.99"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.textTertiary}
                />
                {errors.amountCents && (
                  <Text style={[styles.error, { color: theme.danger }]}>
                    {errors.amountCents.message}
                  </Text>
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
                  placeholder="e.g. Food"
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
            name="dateISO"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.pillBg }]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textTertiary}
                />
                {errors.dateISO && (
                  <Text style={[styles.error, { color: theme.danger }]}>{errors.dateISO.message}</Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="merchant"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Merchant (optional)</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.pillBg }]}
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="e.g. Loblaws"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>
            )}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.tint }]}
            onPress={handleSubmit(onFormSubmit)}
          >
            <Text style={styles.buttonText}>{editTransaction ? 'Update transaction' : 'Add transaction'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
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
  error: { fontSize: 12, marginTop: spacing.xs },
  button: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
