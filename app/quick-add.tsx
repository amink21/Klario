/**
 * Deep link: klario://quick-add?text=...
 * Runs smart input pipeline, shows success toast, navigates to Money or Today/Items by intent.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useStore } from '@/lib/store';
import { colors, spacing } from '@/constants/Theme';
import { Toast } from '@/components/Toast';
import { handleSmartInput } from '@/lib/smartInput/handleSmartInput';
import { executeSmartActions } from '@/lib/smartInput/executeSmartActions';
import { getSettings } from '@/lib/storage';
import { scheduleDueReminder } from '@/lib/notifications';
import { addLifeItem, addSubscription } from '@/lib/storage';

export default function QuickAddScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams<{ text?: string }>();
  const text = params.text?.trim();

  const items = useStore((s) => s.items);
  const setItems = useStore((s) => s.setItems);
  const addTransaction = useStore((s) => s.addTransaction);
  const setSubscriptions = useStore((s) => s.setSubscriptions);
  const load = useStore((s) => s.load);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!text) {
      setToastMessage('No text provided');
      setTimeout(() => router.replace('/(tabs)'), 1500);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const outcome = await handleSmartInput(text, 'today');
        if (cancelled) return;

        if (outcome.action === 'error') {
          setToastMessage(outcome.error || 'Couldn’t parse');
          setTimeout(() => router.replace('/(tabs)'), 2000);
          return;
        }

        const parsed = outcome.parsed;
        const createReminder =
          (parsed.intent === 'reminder' || parsed.intent === 'both') &&
          parsed.reminder != null &&
          parsed.reminder.nextDueISO != null;
        const createSpending =
          (parsed.intent === 'spending' || parsed.intent === 'both') &&
          parsed.spending != null &&
          (parsed.spending.amountCents ?? 0) > 0;

        const settings = await getSettings();
        await executeSmartActions(parsed, {
          defaultRemindDaysBefore: settings.defaultRemindDaysBefore,
          createReminder,
          createSpending,
          createLifeItem: async (item) => {
            let notificationId: string | null = null;
            if (settings.dueItemReminders && item.remindDaysBefore > 0) {
              notificationId = await scheduleDueReminder(
                item.id,
                item.title,
                item.nextDueISO,
                item.remindDaysBefore,
                item.dueTime ?? undefined,
                item.remindMinutesBefore ?? 30
              );
            }
            const withNotif = { ...item, notificationId: notificationId ?? undefined };
            await addLifeItem(withNotif);
            await setItems([...useStore.getState().items, withNotif]);
          },
          addTransaction: (tx) => addTransaction(tx),
          addSubscription: async (sub) => {
            await addSubscription(sub);
            await setSubscriptions([...useStore.getState().subscriptions, sub]);
          },
        });

        await load();
        const msg =
          createReminder && createSpending
            ? 'Added both'
            : createReminder
              ? 'Added reminder'
              : createSpending
                ? 'Added spend'
                : outcome.toastMessage || 'Done';
        setToastMessage(msg);

        if (cancelled) return;
        if (createSpending && !createReminder) {
          setTimeout(() => router.replace('/(tabs)/money'), 1200);
        } else {
          setTimeout(() => router.replace('/(tabs)'), 1200);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Something went wrong');
          setToastMessage('Quick add failed');
          setTimeout(() => router.replace('/(tabs)'), 2000);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {error ? (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      ) : (
        <ActivityIndicator size="large" color={theme.tint} />
      )}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} durationMs={2000} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
});
