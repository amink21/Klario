import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { useStore } from '@/lib/store';
import type { Cadence } from '@/lib/types';
import { addCadenceToDate } from '@/lib/date';
import { updateLifeItem } from '@/lib/storage';
import { scheduleDueReminder, cancelScheduledNotification } from '@/lib/notifications';

const CADENCE_NEXT_LABEL: Record<Exclude<Cadence, 'one_time'>, string> = {
  daily: 'tomorrow',
  weekly: 'next week',
  monthly: 'next month',
  yearly: 'next year',
};

export function ReminderCompletedModal() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const itemId = useStore((s) => s.reminderNotificationItemId);
  const setReminderNotificationItemId = useStore((s) => s.setReminderNotificationItemId);
  const items = useStore((s) => s.items);
  const setItems = useStore((s) => s.setItems);

  const [loading, setLoading] = useState(false);
  const [pushedMessage, setPushedMessage] = useState<string | null>(null);

  const item = itemId ? (items.find((i) => i.id === itemId) ?? null) : null;
  const visible = Boolean(itemId);

  // Clear id if item was deleted
  useEffect(() => {
    if (itemId && items.length >= 0 && !items.find((i) => i.id === itemId)) {
      setReminderNotificationItemId(null);
    }
  }, [itemId, items, setReminderNotificationItemId]);

  const handleClose = () => {
    setPushedMessage(null);
    setReminderNotificationItemId(null);
  };

  const handleNotYet = () => {
    handleClose();
  };

  const handleMarkComplete = async () => {
    if (!item || item.status !== 'active') {
      handleClose();
      return;
    }

    setLoading(true);

    try {
      if (item.cadence === 'one_time') {
        if (item.notificationId) await cancelScheduledNotification(item.notificationId);
        await updateLifeItem(item.id, { status: 'completed', notificationId: null });
        const updated = items.map((i) =>
          i.id === item.id ? { ...i, status: 'completed' as const, notificationId: null } : i
        );
        await setItems(updated);
        handleClose();
        return;
      }

      // Recurring: advance next due and reschedule notification
      const nextDue = addCadenceToDate(item.nextDueISO, item.cadence);
      const settings = await import('@/lib/storage').then((s) => s.getSettings());
      let notificationId: string | null = null;
      if (item.notificationId) await cancelScheduledNotification(item.notificationId);
      if (settings.dueItemReminders && item.remindDaysBefore > 0) {
        notificationId =
          (await scheduleDueReminder(
            item.id,
            item.title,
            nextDue,
            item.remindDaysBefore,
            item.dueTime ?? undefined,
            item.remindMinutesBefore ?? 30
          )) ?? null;
      }
      await updateLifeItem(item.id, { nextDueISO: nextDue, notificationId });
      const updated = items.map((i) =>
        i.id === item.id ? { ...i, nextDueISO: nextDue, notificationId: notificationId ?? undefined } : i
      );
      await setItems(updated);

      const label = CADENCE_NEXT_LABEL[item.cadence as keyof typeof CADENCE_NEXT_LABEL];
      setPushedMessage(`It will now be pushed to ${label}.`);
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !item) return null;

  const isRecurring = item.cadence !== 'one_time';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
          {pushedMessage ? (
            <>
              <Text style={[styles.message, { color: theme.text }]}>{pushedMessage}</Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
                onPress={handleClose}
              >
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Have you completed?</Text>
              <Text style={[styles.itemTitle, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.title}
              </Text>
              {isRecurring && (
                <Text style={[styles.hint, { color: theme.textTertiary }]}>
                  It will be moved to {CADENCE_NEXT_LABEL[item.cadence as keyof typeof CADENCE_NEXT_LABEL]} when you mark complete.
                </Text>
              )}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: theme.border }]}
                  onPress={handleNotYet}
                  disabled={loading}
                >
                  <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Not yet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: theme.tint }]}
                  onPress={handleMarkComplete}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Mark complete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  itemTitle: {
    fontSize: 16,
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  primaryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
