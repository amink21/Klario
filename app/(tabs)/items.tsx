import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useStore } from '@/lib/store';
import { colors, spacing, radius } from '@/constants/Theme';
import { SwipeableReminderRow } from '@/components/SwipeableReminderRow';
import { SmartInputBar } from '@/components/SmartInputBar';
import { SmartInputReviewSheet } from '@/components/SmartInputReviewSheet';
import { Toast } from '@/components/Toast';
import { AddItemSheet } from '@/components/AddItemSheet';
import { ItemDetailsSheet } from '@/components/ItemDetailsSheet';
import { TabScreenAnimation } from '@/components/TabScreenAnimation';
import BottomSheet from '@gorhom/bottom-sheet';
import type { LifeItem } from '@/lib/types';
import { daysUntil, isOverdue, getDueTimestamp } from '@/lib/date';
import { generateId } from '@/lib/id';
import { updateLifeItem, deleteLifeItem } from '@/lib/storage';
import { cancelScheduledNotification, scheduleDueReminder } from '@/lib/notifications';
import { handleSmartInput } from '@/lib/smartInput/handleSmartInput';
import { executeSmartActions } from '@/lib/smartInput/executeSmartActions';

type Filter = 'all' | 'today' | 'overdue' | 'due_soon' | 'daily' | 'monthly' | 'yearly' | 'cancelled' | 'completed';

export default function ItemsScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const items = useStore((s) => s.items);
  const transactions = useStore((s) => s.transactions);
  const subscriptions = useStore((s) => s.subscriptions);
  const setItems = useStore((s) => s.setItems);
  const addTransaction = useStore((s) => s.addTransaction);
  const setSubscriptions = useStore((s) => s.setSubscriptions);
  const load = useStore((s) => s.load);
  const settings = useStore((s) => s.settings);

  const [filter, setFilter] = React.useState<Filter>('all');
  const [selectedItem, setSelectedItem] = React.useState<LifeItem | null>(null);
  const [draftQuickAdd, setDraftQuickAdd] = React.useState<string | null>(null);
  const [smartInputLoading, setSmartInputLoading] = React.useState(false);
  const [reviewParsed, setReviewParsed] = React.useState<import('@/lib/ai/schemas').SmartInputParseResult | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const addSheetRef = useRef<BottomSheet>(null);
  const detailsSheetRef = useRef<BottomSheet>(null);
  const reviewSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const active = items.filter((i) => i.status === 'active');
    let list: LifeItem[];
    switch (filter) {
      case 'today':
        list = active.filter((i) => daysUntil(i.nextDueISO) === 0);
        break;
      case 'overdue':
        list = active.filter((i) => isOverdue(i.nextDueISO, i.dueTime));
        break;
      case 'due_soon':
        list = active.filter((i) => {
          const d = daysUntil(i.nextDueISO);
          return d >= 0 && d <= 14;
        });
        break;
      case 'daily':
        list = active.filter((i) => i.cadence === 'daily');
        break;
      case 'monthly':
        list = active.filter((i) => i.cadence === 'monthly');
        break;
      case 'yearly':
        list = active.filter((i) => i.cadence === 'yearly');
        break;
      case 'cancelled':
        list = items.filter((i) => i.status === 'cancelled');
        break;
      case 'completed':
        list = items.filter((i) => i.status === 'completed');
        break;
      default:
        list = items;
    }
    return [...list].sort((a, b) => getDueTimestamp(a.nextDueISO, a.dueTime) - getDueTimestamp(b.nextDueISO, b.dueTime));
  }, [items, filter]);

  const handleAddItem = async (item: Omit<LifeItem, 'id' | 'status'>) => {
    const { addLifeItem } = await import('@/lib/storage');
    const id = generateId();
    const settings = await import('@/lib/storage').then((s) => s.getSettings());
    let notificationId: string | null = null;
    if (settings.dueItemReminders && item.remindDaysBefore > 0) {
      notificationId = await scheduleDueReminder(
        id,
        item.title,
        item.nextDueISO,
        item.remindDaysBefore,
        item.dueTime ?? undefined,
        item.remindMinutesBefore ?? 30
      );
    }
    const newItem: LifeItem = {
      ...item,
      id,
      status: 'active',
      notificationId: notificationId ?? undefined,
    };
    await addLifeItem(newItem);
    await setItems([...items, newItem]);
    setDraftQuickAdd(null);
  };

  const defaultRemindDaysBefore = settings?.defaultRemindDaysBefore ?? 1;

  const runExecute = async (
    parsed: import('@/lib/ai/schemas').SmartInputParseResult,
    createReminder: boolean,
    createSpending: boolean
  ) => {
    const s = await import('@/lib/storage').then((r) => r.getSettings());
    const { addLifeItem, addSubscription } = await import('@/lib/storage');
    const { scheduleDueReminder } = await import('@/lib/notifications');
    const result = await executeSmartActions(parsed, {
      defaultRemindDaysBefore: s.defaultRemindDaysBefore,
      createReminder,
      createSpending,
      createLifeItem: async (item) => {
        let notificationId: string | null = null;
        if (s.dueItemReminders && item.remindDaysBefore > 0) {
          notificationId = await scheduleDueReminder(
            item.id,
            item.title,
            item.nextDueISO,
            item.remindDaysBefore,
            item.dueTime ?? undefined,
            item.remindMinutesBefore ?? 30
          );
        }
        await addLifeItem({ ...item, notificationId: notificationId ?? undefined });
        await setItems([...items, { ...item, notificationId: notificationId ?? undefined }]);
      },
      addTransaction: async (tx) => addTransaction(tx),
      addSubscription: async (sub) => {
        await addSubscription(sub);
        await setSubscriptions([...subscriptions, sub]);
      },
    });
    if (result.toastMessage) setToastMessage(result.toastMessage);
    await load();
    return result;
  };

  const handleSmartInputSubmit = async (text: string) => {
    setSmartInputLoading(true);
    try {
      const outcome = await handleSmartInput(text, 'items');
      if (outcome.action === 'error') {
        Alert.alert('Couldn’t parse', outcome.error + '\n\nOpen Add Item to enter manually.');
        setDraftQuickAdd(text);
        addSheetRef.current?.snapToIndex(0);
        return;
      }
      if (outcome.action === 'review') {
        setReviewParsed(outcome.parsed);
        reviewSheetRef.current?.snapToIndex(0);
        return;
      }
      const createReminder =
        (outcome.parsed.intent === 'reminder' || outcome.parsed.intent === 'both') &&
        outcome.parsed.reminder != null &&
        outcome.parsed.reminder.nextDueISO != null;
      const createSpending =
        (outcome.parsed.intent === 'spending' || outcome.parsed.intent === 'both') &&
        outcome.parsed.spending != null &&
        (outcome.parsed.spending.amountCents ?? 0) > 0;
      const result = await runExecute(outcome.parsed, createReminder, createSpending);
      if (result.toastMessage) setToastMessage(result.toastMessage);
      if (result.created.lifeItemId) {
        const nextItems = await import('@/lib/storage').then((r) => r.getLifeItems());
        const newItem = nextItems.find((i) => i.id === result.created.lifeItemId) ?? null;
        if (newItem) {
          setSelectedItem(newItem);
          detailsSheetRef.current?.snapToIndex(0);
        }
      }
    } finally {
      setSmartInputLoading(false);
    }
  };

  const handleReviewConfirm = async (payload: {
    parsed: import('@/lib/ai/schemas').SmartInputParseResult;
    createReminder: boolean;
    createSpending: boolean;
  }) => {
    const result = await runExecute(payload.parsed, payload.createReminder, payload.createSpending);
    setReviewParsed(null);
    if (result.created.lifeItemId) {
      const nextItems = await import('@/lib/storage').then((r) => r.getLifeItems());
      const newItem = nextItems.find((i) => i.id === result.created.lifeItemId) ?? null;
      if (newItem) {
        setSelectedItem(newItem);
        detailsSheetRef.current?.snapToIndex(0);
      }
    }
  };

  const handleUpdateItem = async (id: string, patch: Partial<LifeItem>) => {
    const existing = items.find((i) => i.id === id);
    if (!existing) return;
    const becomingCompletedOrCancelled = patch.status === 'cancelled' || patch.status === 'completed';
    if (becomingCompletedOrCancelled && existing.notificationId) {
      await cancelScheduledNotification(existing.notificationId);
    }
    let notificationId = existing.notificationId ?? undefined;
    const nextDue = patch.nextDueISO ?? existing.nextDueISO;
    const remindDays = patch.remindDaysBefore ?? existing.remindDaysBefore;
    if (!becomingCompletedOrCancelled && remindDays > 0) {
      if (existing.notificationId) await cancelScheduledNotification(existing.notificationId);
      notificationId =
        (await scheduleDueReminder(id, patch.title ?? existing.title, nextDue, remindDays, patch.dueTime ?? existing.dueTime ?? undefined, patch.remindMinutesBefore ?? existing.remindMinutesBefore ?? 30)) ?? undefined;
    }
    await updateLifeItem(id, { ...patch, notificationId: notificationId ?? null });
    const updated = items.map((i) => (i.id === id ? { ...i, ...patch, notificationId } : i));
    await setItems(updated);
  };

  const handleMarkDone = async (item: LifeItem) => {
    if (item.cadence === 'one_time') {
      await handleUpdateItem(item.id, { status: 'completed' });
      return;
    }
    const { addCadenceToDate } = await import('@/lib/date');
    const nextDue = addCadenceToDate(item.nextDueISO, item.cadence);
    await handleUpdateItem(item.id, { nextDueISO: nextDue });
  };

  const handleMarkRenewed = async () => {
    if (!selectedItem || selectedItem.cadence === 'one_time') return;
    const { addCadenceToDate } = await import('@/lib/date');
    const nextDue = addCadenceToDate(selectedItem.nextDueISO, selectedItem.cadence);
    await handleUpdateItem(selectedItem.id, { nextDueISO: nextDue });
    setSelectedItem(null);
  };

  const handleDeleteItem = async (item: LifeItem) => {
    Alert.alert(
      'Delete reminder',
      `Remove "${item.title}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item.notificationId) {
              await cancelScheduledNotification(item.notificationId);
            }
            await deleteLifeItem(item.id);
            await setItems(items.filter((i) => i.id !== item.id));
            setSelectedItem(null);
            setToastMessage('Reminder deleted');
          },
        },
      ]
    );
  };

  const filterPills: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'due_soon', label: '14 days' },
    { key: 'daily', label: 'Daily' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <TabScreenAnimation>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Reminders</Text>
          <View style={styles.quickAddWrap}>
            <SmartInputBar
              context="items"
              onSubmit={handleSmartInputSubmit}
              loading={smartInputLoading}
            />
          </View>
        </View>

        <View style={[styles.filterSection, { backgroundColor: theme.background }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContent}
            style={styles.pillsScroll}
          >
            {filterPills.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.pill,
                  { backgroundColor: filter === p.key ? theme.accentPill : theme.pillBg },
                ]}
                onPress={() => setFilter(p.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, { color: filter === p.key ? theme.text : theme.textSecondary }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: theme.textTertiary }]}>
              {filter === 'cancelled' ? 'No cancelled reminders.' :
               filter === 'completed' ? 'No completed reminders.' :
               filter === 'overdue' ? 'No overdue reminders.' :
               filter === 'today' ? 'Nothing due today.' :
               'No reminders yet. Add one above.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SwipeableReminderRow
            item={item}
            onPress={() => {
              setSelectedItem(item);
              addSheetRef.current?.snapToIndex(0);
            }}
            onDelete={() => handleDeleteItem(item)}
            onMarkDone={item.status === 'active' ? handleMarkDone : undefined}
            dangerColor={theme.danger}
            iconColor="#fff"
          />
        )}
      />

      <AddItemSheet
        bottomSheetRef={addSheetRef}
        onSubmit={handleAddItem}
        editItem={selectedItem}
        onUpdate={(id, patch) => {
          handleUpdateItem(id, patch);
          addSheetRef.current?.close();
          setSelectedItem(null);
        }}
        initialTitle={draftQuickAdd ?? undefined}
        defaultRemindDaysBefore={defaultRemindDaysBefore}
      />
        <ItemDetailsSheet
          bottomSheetRef={detailsSheetRef}
          item={selectedItem}
          onEdit={() => {
            detailsSheetRef.current?.close();
            addSheetRef.current?.snapToIndex(0);
          }}
          onMarkRenewed={handleMarkRenewed}
          onCancel={() => selectedItem && handleUpdateItem(selectedItem.id, { status: 'cancelled' })}
        />
        <SmartInputReviewSheet
          bottomSheetRef={reviewSheetRef}
          parsed={reviewParsed}
          defaultRemindDaysBefore={defaultRemindDaysBefore}
          onConfirm={handleReviewConfirm}
          onClose={() => setReviewParsed(null)}
        />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </View>
    </TabScreenAnimation>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5, marginBottom: spacing.md },
  quickAddWrap: {},
  filterSection: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xl,
  },
  pillsScroll: { flexGrow: 0 },
  pillsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
  },
  pillText: { fontSize: 14, fontWeight: '500' },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 100 },
  emptyWrap: { paddingVertical: spacing.xxl * 1.5, paddingHorizontal: spacing.xl },
  empty: { fontSize: 15, textAlign: 'center' },
});
