import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import type { Subscription } from '@/lib/types';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  amountCents: z.union([z.string().min(1, 'Amount required'), z.number().positive()]),
  cadence: z.enum(['monthly', 'yearly']),
  nextDueISO: z.string().min(1, 'Due date required'),
});

type FormData = z.infer<typeof schema>;

interface AddSubscriptionSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  onSubmit: (sub: Omit<Subscription, 'id' | 'detected'>) => void;
}

export function AddSubscriptionSheet({ bottomSheetRef, onSubmit }: AddSubscriptionSheetProps) {
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
      cadence: 'monthly',
      nextDueISO: new Date().toISOString().slice(0, 10),
    },
  });

  const onFormSubmit = useCallback(
    (data: FormData) => {
      const amountCents = Math.round(
        Number(String(data.amountCents).replace(/[^0-9.-]/g, '')) * 100
      );
      onSubmit({
        title: data.title,
        amountCents,
        cadence: data.cadence,
        nextDueISO: data.nextDueISO,
      });
      bottomSheetRef.current?.close();
      reset();
    },
    [onSubmit, bottomSheetRef, reset]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['55%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.surfaceElevated ?? theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Add subscription</Text>
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
                placeholder="e.g. Spotify"
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
                placeholder="e.g. 10.99"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.textTertiary}
              />
              {errors.amountCents && (
                <Text style={[styles.error, { color: theme.danger }]}>{errors.amountCents.message}</Text>
              )}
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
                {(['monthly', 'yearly'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.pill, { backgroundColor: value === c ? theme.tint : theme.pillBg }]}
                    onPress={() => onChange(c)}
                  >
                    <Text style={[styles.pillText, { color: value === c ? '#fff' : theme.text }]}>{c}</Text>
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
              <Text style={[styles.label, { color: theme.textSecondary }]}>Next due</Text>
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
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.tint }]}
          onPress={handleSubmit(onFormSubmit)}
        >
          <Text style={styles.buttonText}>Add subscription</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: spacing.xl, letterSpacing: -0.5 },
  field: { marginBottom: spacing.lg },
  label: { fontSize: 13, marginBottom: spacing.xs },
  input: { borderRadius: radius.lg, padding: spacing.lg, fontSize: 16 },
  error: { fontSize: 12, marginTop: spacing.xs },
  pills: { flexDirection: 'row', gap: spacing.sm },
  pill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full },
  pillText: { fontSize: 14, fontWeight: '500' },
  button: { padding: spacing.lg, borderRadius: radius.xl, alignItems: 'center', marginTop: spacing.xl },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
