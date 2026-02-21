import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { useStore } from '@/lib/store';
import { todayISO } from '@/lib/date';
import type { Transaction } from '@/lib/types';

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

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  const transactions = useStore((s) => s.transactions);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);

  const transaction = id ? transactions.find((t) => t.id === id) ?? null : null;

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
    if (transaction) {
      reset({
        title: transaction.title,
        amountCents: String(Math.abs(transaction.amountCents) / 100),
        category: transaction.category,
        dateISO: transaction.dateISO,
        merchant: transaction.merchant ?? '',
      });
    } else if (id) {
      router.back();
    }
  }, [transaction, id, reset, router]);

  const onUpdate = useCallback(
    (data: FormData) => {
      if (!transaction) return;
      const rawAmount = Math.round(
        Number(String(data.amountCents).replace(/[^0-9.-]/g, '')) * 100
      );
      const amountCents = rawAmount;
      updateTransaction({
        ...transaction,
        title: data.title,
        amountCents,
        category: data.category,
        dateISO: data.dateISO,
        merchant: data.merchant || undefined,
      });
      router.back();
    },
    [transaction, updateTransaction, router]
  );

  const onDelete = useCallback(() => {
    if (!transaction) return;
    Alert.alert(
      'Delete transaction',
      `Remove "${transaction.title}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(transaction.id);
            router.back();
          },
        },
      ]
    );
  }, [transaction, deleteTransaction, router]);

  if (!transaction) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: spacing.md,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FontAwesome name="chevron-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Edit transaction
        </Text>
        <View style={styles.headerBack} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Title
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.pillBg },
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Groceries"
                  placeholderTextColor={theme.textTertiary}
                />
                {errors.title && (
                  <Text style={[styles.error, { color: theme.danger }]}>
                    {errors.title.message}
                  </Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="amountCents"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Amount
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.pillBg },
                  ]}
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
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Category
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.pillBg },
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Food"
                  placeholderTextColor={theme.textTertiary}
                />
                {errors.category && (
                  <Text style={[styles.error, { color: theme.danger }]}>
                    {errors.category.message}
                  </Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="dateISO"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Date
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.pillBg },
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textTertiary}
                />
                {errors.dateISO && (
                  <Text style={[styles.error, { color: theme.danger }]}>
                    {errors.dateISO.message}
                  </Text>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="merchant"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Merchant (optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.pillBg },
                  ]}
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
            onPress={handleSubmit(onUpdate)}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Update transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: theme.danger }]}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Text style={[styles.deleteButtonText, { color: theme.danger }]}>
              Delete transaction
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  headerBack: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingTop: spacing.xl },
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
    marginTop: spacing.lg,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
  },
  deleteButtonText: { fontSize: 16, fontWeight: '600' },
});
