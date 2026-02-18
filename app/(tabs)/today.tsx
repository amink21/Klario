import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useStore } from '@/lib/store';
import { colors, spacing, radius } from '@/constants/Theme';
import { UpcomingList } from '@/components/UpcomingList';
import { SmartInputBar, type InputBoxStatus } from '@/components/SmartInputBar';
import { SmartInputReviewSheet } from '@/components/SmartInputReviewSheet';
import { Toast } from '@/components/Toast';
import { AddItemSheet } from '@/components/AddItemSheet';
import { DatePickerSheet } from '@/components/DatePickerSheet';
import { TabScreenAnimation } from '@/components/TabScreenAnimation';
import BottomSheet from '@gorhom/bottom-sheet';
import { formatCurrency } from '@/lib/currency';
import { computeLifeStatus, computeUpcomingBreakdown } from '@/lib/forecast';
import { yesterdayISO, todayISO, formatDisplayDate, startOfMonthISO } from '@/lib/date';
import { handleSmartInput } from '@/lib/smartInput/handleSmartInput';
import { executeSmartActions } from '@/lib/smartInput/executeSmartActions';
import { generateId } from '@/lib/id';
import type { LifeItem } from '@/lib/types';

export default function TodayScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const items = useStore((s) => s.items);
  const transactions = useStore((s) => s.transactions);
  const subscriptions = useStore((s) => s.subscriptions);
  const setItems = useStore((s) => s.setItems);
  const addTransaction = useStore((s) => s.addTransaction);
  const setSubscriptions = useStore((s) => s.setSubscriptions);
  const load = useStore((s) => s.load);
  const deepLinkItemId = useStore((s) => s.deepLinkItemId);
  const setDeepLinkItemId = useStore((s) => s.setDeepLinkItemId);

  const addItemRef = useRef<BottomSheet>(null);
  const datePickerRef = useRef<BottomSheet>(null);
  const reviewSheetRef = useRef<BottomSheet>(null);
  const [selectedItem, setSelectedItem] = React.useState<LifeItem | null>(null);
  const [draftQuickAdd, setDraftQuickAdd] = React.useState<string | null>(null);
  const [viewDateISO, setViewDateISO] = React.useState<string>(() => todayISO());
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [comingUpDays, setComingUpDays] = React.useState<0 | 7 | 14 | 30>(14);
  const [smartInputLoading, setSmartInputLoading] = React.useState(false);
  const [inputBoxStatus, setInputBoxStatus] = React.useState<InputBoxStatus>(null);
  const [reviewParsed, setReviewParsed] = React.useState<import('@/lib/ai/schemas').SmartInputParseResult | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [upcomingExpanded, setUpcomingExpanded] = React.useState(false);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link: open item sheet when navigated from due-reminder notification.
  useEffect(() => {
    if (!deepLinkItemId || items.length === 0) return;
    const item = items.find((i) => i.id === deepLinkItemId);
    if (item) {
      setSelectedItem(item);
      addItemRef.current?.snapToIndex(0);
    }
    setDeepLinkItemId(null);
  }, [deepLinkItemId, items, setDeepLinkItemId]);

  const activeItems = items.filter((i) => i.status === 'active');
  const upcoming30 = computeUpcomingBreakdown(activeItems, subscriptions, 30);
  const upcoming7 = computeUpcomingBreakdown(activeItems, subscriptions, 7);
  const lifeStatus = computeLifeStatus(activeItems);
  const monthStart = startOfMonthISO();
  const yesterdaySpend = transactions
    .filter((t) => t.dateISO === yesterdayISO())
    .reduce((sum, t) => sum + t.amountCents, 0);
  const monthSpend = transactions
    .filter((t) => t.dateISO >= monthStart)
    .reduce((sum, t) => sum + t.amountCents, 0);

  const statusColors = {
    Stable: theme.chipStable,
    Watch: theme.chipWatch,
    'Action Needed': theme.chipAction,
  };

  const handleAddItem = async (item: Omit<LifeItem, 'id' | 'status'>) => {
    const { addLifeItem } = await import('@/lib/storage');
    const { scheduleDueReminder } = await import('@/lib/notifications');
    const id = generateId();
    let notificationId: string | null = null;
    const settings = await import('@/lib/storage').then((s) => s.getSettings());
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
    setSelectedItem(null);
    setDraftQuickAdd(null);
  };

  const handleUpdateItem = async (id: string, patch: Partial<LifeItem>) => {
    const { updateLifeItem, getLifeItem } = await import('@/lib/storage');
    const { scheduleDueReminder, cancelScheduledNotification } = await import('@/lib/notifications');
    const existing = await getLifeItem(id);
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
    setSelectedItem(null);
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

  const runExecute = async (
    parsed: import('@/lib/ai/schemas').SmartInputParseResult,
    createReminder: boolean,
    createSpending: boolean
  ) => {
    const settings = await import('@/lib/storage').then((s) => s.getSettings());
    const { addLifeItem, addSubscription } = await import('@/lib/storage');
    const { scheduleDueReminder } = await import('@/lib/notifications');
    const result = await executeSmartActions(parsed, {
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
        await setItems([...items, withNotif]);
      },
      addTransaction: async (tx) => addTransaction(tx),
      addSubscription: async (sub) => {
        await addSubscription(sub);
        await setSubscriptions([...subscriptions, sub]);
      },
    });
    // Toast not shown for add success — result is shown in the input bar
    await load();
    return result;
  };

  const handleSmartInputSubmit = async (text: string) => {
    setSmartInputLoading(true);
    setInputBoxStatus('thinking');
    try {
      const outcome = await handleSmartInput(text, 'today');
      if (outcome.action === 'error') {
        setInputBoxStatus(null);
        Alert.alert('Couldn’t parse', outcome.error + '\n\nOpen Add Item to enter manually.');
        setDraftQuickAdd(text);
        setSelectedItem(null);
        addItemRef.current?.snapToIndex(0);
        return;
      }
      if (outcome.action === 'review') {
        setInputBoxStatus(null);
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
      await runExecute(outcome.parsed, createReminder, createSpending);
      const resultStatus: InputBoxStatus =
        createReminder && createSpending ? 'both' : createReminder ? 'reminder' : 'transaction';
      setInputBoxStatus(resultStatus);
      setTimeout(() => setInputBoxStatus(null), 2000);
    } finally {
      setSmartInputLoading(false);
    }
  };

  const handleReviewConfirm = async (payload: {
    parsed: import('@/lib/ai/schemas').SmartInputParseResult;
    createReminder: boolean;
    createSpending: boolean;
  }) => {
    await runExecute(payload.parsed, payload.createReminder, payload.createSpending);
    setReviewParsed(null);
    const resultStatus: InputBoxStatus =
      payload.createReminder && payload.createSpending
        ? 'both'
        : payload.createReminder
          ? 'reminder'
          : 'transaction';
    setInputBoxStatus(resultStatus);
    setTimeout(() => setInputBoxStatus(null), 2000);
  };

  const settings = useStore((s) => s.settings);
  const defaultRemindDaysBefore = settings?.defaultRemindDaysBefore ?? 1;

  return (
    <TabScreenAnimation>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Date header — always on top, fixed */}
        <View style={[styles.dateHeader, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            onPress={() => {
              setDatePickerOpen(true);
              datePickerRef.current?.snapToIndex(0);
            }}
            activeOpacity={0.7}
            style={styles.dateTitleWrap}
          >
            <Text style={[styles.pageTitle, { color: theme.text }]}>
              {formatDisplayDate(viewDateISO)}
            </Text>
            <Text style={[styles.dateHint, { color: theme.textTertiary }]}>Tap to change date</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.quickAddWrap}>
          <SmartInputBar
            context="today"
            onSubmit={handleSmartInputSubmit}
            loading={smartInputLoading}
            boxStatus={inputBoxStatus}
          />
        </View>

        {/* Status — near top with clear description */}
        <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statusCardTitle, { color: theme.textSecondary }]}>
            Your load
          </Text>
          <Text style={[styles.statusCardHint, { color: theme.textTertiary }]}>
            {lifeStatus === 'Stable' && 'You’re on top of things — few or no reminders due in the next 7 days.'}
            {lifeStatus === 'Watch' && 'A few reminders need attention soon. Consider planning or paying in the next 7 days.'}
            {lifeStatus === 'Action Needed' && 'Several reminders are due soon. Plan or pay to stay on track.'}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: statusColors[lifeStatus], alignSelf: 'flex-start' }]}>
            <Text style={[styles.statusChipText, { color: theme.text }]}>{lifeStatus}</Text>
          </View>
        </View>

        {/* Coming up — with days filter */}
        <View style={styles.comingUpHeader}>
          <Text style={[styles.sectionLabel, styles.sectionLabelInRow, { color: theme.textSecondary }]}>Coming up</Text>
          <TouchableOpacity
            onPress={() => router.push('/items')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.viewAllLink, { color: theme.tint }]}>View all reminders</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              { backgroundColor: comingUpDays === 0 ? theme.accentPill : theme.pillBg },
            ]}
            onPress={() => setComingUpDays(0)}
          >
            <Text style={[styles.filterPillText, { color: comingUpDays === 0 ? theme.text : theme.textSecondary }]}>
              Today
            </Text>
          </TouchableOpacity>
          {([7, 14, 30] as const).map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.filterPill,
                { backgroundColor: comingUpDays === days ? theme.accentPill : theme.pillBg },
              ]}
              onPress={() => setComingUpDays(days)}
            >
              <Text style={[styles.filterPillText, { color: comingUpDays === days ? theme.text : theme.textSecondary }]}>
                {days} days
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <UpcomingList
          items={items}
          limit={10}
          withinDays={comingUpDays}
          onItemPress={(item) => {
            setSelectedItem(item);
            addItemRef.current?.snapToIndex(0);
          }}
          onMarkDone={handleMarkDone}
        />

        {/* Upcoming Money — tappable card; tap reveals breakdown */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Upcoming money</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => upcoming30.byCategory.length > 0 && setUpcomingExpanded((e) => !e)}
          style={[styles.upcomingCard, { backgroundColor: theme.surface }]}
        >
          <View style={styles.upcomingHeadlineRow}>
            <Text style={[styles.upcomingHeadline, { color: theme.text }]}>
              You have {formatCurrency(upcoming30.totalCents)} due in the next 30 days
            </Text>
            {upcoming30.byCategory.length > 0 && (
              <Text style={[styles.upcomingTapHint, { color: theme.textTertiary }]}>
                {upcomingExpanded ? 'Tap to collapse' : 'Tap to see breakdown'}
              </Text>
            )}
          </View>
          {upcomingExpanded && upcoming30.byCategory.length > 0 && (
            <View style={styles.breakdown}>
              {upcoming30.byCategory.map(({ category, amountCents }, index) => (
                <View
                  key={category}
                  style={[
                    styles.breakdownRow,
                    { borderTopColor: theme.border },
                    index === 0 && styles.breakdownRowFirst,
                  ]}
                >
                  <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>{category}</Text>
                  <Text style={[styles.breakdownAmount, { color: theme.text }]}>{formatCurrency(amountCents)}</Text>
                </View>
              ))}
            </View>
          )}
          {!upcomingExpanded && upcoming30.byCategory.length === 0 && (
            <Text style={[styles.upcomingHint, { color: theme.textTertiary }]}>
              Add reminders or subscriptions with amounts to see your forecast.
            </Text>
          )}
        </TouchableOpacity>

        {/* At a glance — combined quick stats */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>At a glance</Text>
        <View style={styles.glanceGrid}>
          <View style={[styles.glanceCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.glanceLabel, { color: theme.textSecondary }]}>Next 30 days</Text>
            <Text style={[styles.glanceValue, { color: theme.text }]}>{formatCurrency(upcoming30.totalCents)}</Text>
          </View>
          <View style={[styles.glanceCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.glanceLabel, { color: theme.textSecondary }]}>Due in 7 days</Text>
            <Text style={[styles.glanceValue, { color: theme.text }]}>{formatCurrency(upcoming7.totalCents)}</Text>
          </View>
          <View style={[styles.glanceCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.glanceLabel, { color: theme.textSecondary }]}>Yesterday</Text>
            <Text style={[styles.glanceValue, { color: theme.text }]}>{formatCurrency(yesterdaySpend)}</Text>
          </View>
          <View style={[styles.glanceCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.glanceLabel, { color: theme.textSecondary }]}>This month</Text>
            <Text style={[styles.glanceValue, { color: theme.text }]}>{formatCurrency(monthSpend)}</Text>
          </View>
        </View>

      </ScrollView>

        <AddItemSheet
          bottomSheetRef={addItemRef}
          onSubmit={handleAddItem}
          editItem={selectedItem}
          onUpdate={handleUpdateItem}
          initialTitle={draftQuickAdd ?? undefined}
        />
        <DatePickerSheet
          bottomSheetRef={datePickerRef}
          isOpen={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          selectedISO={viewDateISO}
          onSelect={(iso) => {
            setViewDateISO(iso);
            setDatePickerOpen(false);
          }}
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
  dateHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingTop: spacing.sm },
  dateTitleWrap: {},
  pageTitle: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  dateHint: { fontSize: 12, marginTop: 4 },
  quickAddWrap: { marginBottom: spacing.lg },
  comingUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
    letterSpacing: 0.2,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabelInRow: {
    marginTop: 0,
  },
  statusCard: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.xl,
  },
  statusCardTitle: { fontSize: 13, fontWeight: '600', marginBottom: spacing.xs, letterSpacing: 0.2 },
  statusCardHint: { fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusChipText: { fontSize: 14, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  filterPillText: { fontSize: 14, fontWeight: '500' },
  upcomingCard: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
  },
  upcomingHeadlineRow: {
    marginBottom: spacing.xs,
  },
  upcomingHeadline: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  upcomingTapHint: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  upcomingHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  breakdown: {
    marginTop: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  breakdownRowFirst: {
    borderTopWidth: 0,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  glanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  glanceCard: {
    width: '48%',
    minWidth: 0,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
  },
  glanceLabel: { fontSize: 13, fontWeight: '500', marginBottom: spacing.xs, letterSpacing: 0.2 },
  glanceValue: { fontSize: 20, fontWeight: '600', letterSpacing: -0.5 },
});
