import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useStore } from '@/lib/store';
import { colors, spacing, radius } from '@/constants/Theme';
import { SmartInputBar } from '@/components/SmartInputBar';
import { SmartInputReviewSheet } from '@/components/SmartInputReviewSheet';
import { Toast } from '@/components/Toast';
import { AddItemSheet } from '@/components/AddItemSheet';
import { TabScreenAnimation } from '@/components/TabScreenAnimation';
import BottomSheet from '@gorhom/bottom-sheet';
import { formatCurrency } from '@/lib/currency';
import { startOfMonthISO } from '@/lib/date';
import { SubscriptionWasteCard } from '@/components/SubscriptionWasteCard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { extractText as extractPdfText, isAvailable as isPdfExtractAvailable } from 'expo-pdf-text-extract';
import { parseStatement, parseStatementFromFileContent } from '@/lib/parseStatement';
import { generateId } from '@/lib/id';
import type { LifeItem, Subscription } from '@/lib/types';
import { handleSmartInput } from '@/lib/smartInput/handleSmartInput';
import { executeSmartActions } from '@/lib/smartInput/executeSmartActions';

export default function MoneyScreen() {
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

  const addItemRef = useRef<BottomSheet>(null);
  const reviewSheetRef = useRef<BottomSheet>(null);
  const [selectedItem, setSelectedItem] = React.useState<LifeItem | null>(null);
  const [draftQuickAdd, setDraftQuickAdd] = React.useState<string | null>(null);
  const [statementText, setStatementText] = React.useState('');
  const [importMessage, setImportMessage] = React.useState<string | null>(null);
  const [smartInputLoading, setSmartInputLoading] = React.useState(false);
  const [reviewParsed, setReviewParsed] = React.useState<import('@/lib/ai/schemas').SmartInputParseResult | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddItem = async (item: Omit<LifeItem, 'id' | 'status'>) => {
    const { addLifeItem } = await import('@/lib/storage');
    const { scheduleDueReminder } = await import('@/lib/notifications');
    const id = generateId();
    const settings = await import('@/lib/storage').then((s) => s.getSettings());
    let notificationId: string | null = null;
    if (settings.dueItemReminders && item.remindDaysBefore > 0) {
      notificationId = await scheduleDueReminder(
        id,
        item.title,
        item.nextDueISO,
        item.remindDaysBefore,
        item.dueTime ?? undefined
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
    setSelectedItem(null);
  };

  const defaultRemindDaysBefore = settings?.defaultRemindDaysBefore ?? 7;

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
            item.dueTime ?? undefined
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
      const outcome = await handleSmartInput(text, 'money');
      if (outcome.action === 'error') {
        Alert.alert('Couldn’t parse', outcome.error + '\n\nOpen Add Item to enter manually.');
        setDraftQuickAdd(text);
        setSelectedItem(null);
        addItemRef.current?.snapToIndex(0);
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
      await runExecute(outcome.parsed, createReminder, createSpending);
      if (outcome.toastMessage) setToastMessage(outcome.toastMessage);
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
  };

  const handleUpdateItem = async (id: string, patch: Partial<LifeItem>) => {
    const { updateLifeItem, getLifeItem } = await import('@/lib/storage');
    const { scheduleDueReminder, cancelScheduledNotification } = await import('@/lib/notifications');
    const existing = await getLifeItem(id);
    if (!existing) return;
    if (patch.status === 'cancelled' && existing.notificationId) {
      await cancelScheduledNotification(existing.notificationId);
    }
    let notificationId = existing.notificationId ?? undefined;
    const nextDue = patch.nextDueISO ?? existing.nextDueISO;
    const remindDays = patch.remindDaysBefore ?? existing.remindDaysBefore;
    if (patch.status !== 'cancelled' && remindDays > 0) {
      if (existing.notificationId) await cancelScheduledNotification(existing.notificationId);
      notificationId =
        (await scheduleDueReminder(id, patch.title ?? existing.title, nextDue, remindDays, patch.dueTime ?? existing.dueTime ?? undefined)) ?? undefined;
    }
    await updateLifeItem(id, { ...patch, notificationId: notificationId ?? null });
    const updated = items.map((i) => (i.id === id ? { ...i, ...patch, notificationId } : i));
    await setItems(updated);
    setSelectedItem(null);
  };

  const handleImportStatement = async () => {
    const parsed = parseStatement(statementText);
    if (parsed.length === 0) {
      setImportMessage('No transactions found. Add lines like "Starbucks $5.50" or "Shell Gas 45.00".');
      return;
    }
    for (const p of parsed) {
      await addTransaction({
        id: generateId(),
        title: p.title,
        amountCents: p.amountCents,
        category: p.category,
        dateISO: p.dateISO,
      });
    }
    setStatementText('');
    setImportMessage(`Added ${parsed.length} transaction${parsed.length === 1 ? '' : 's'}.`);
    setTimeout(() => setImportMessage(null), 3000);
  };

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/csv', 'application/pdf', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      const uri = asset.uri;
      const name = asset.name?.toLowerCase() ?? '';
      const mimeType = asset.mimeType ?? '';
      const isPdf = mimeType === 'application/pdf' || name.endsWith('.pdf');

      let content: string;
      if (isPdf) {
        if (isPdfExtractAvailable()) {
          content = await extractPdfText(uri);
        } else {
          setImportMessage('PDF text extraction requires a development build. Use CSV or text file, or paste statement.');
          setTimeout(() => setImportMessage(null), 4000);
          return;
        }
      } else {
        content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      }

      const parsed = parseStatementFromFileContent(content);
      if (parsed.length === 0) {
        setImportMessage('No transactions found. Try CSV (Date, Description, Amount), PDF statement, or plain text lines.');
        setTimeout(() => setImportMessage(null), 4000);
        return;
      }
      for (const p of parsed) {
        await addTransaction({
          id: generateId(),
          title: p.title,
          amountCents: p.amountCents,
          category: p.category,
          dateISO: p.dateISO,
        });
      }
      setImportMessage(`Added ${parsed.length} transaction${parsed.length === 1 ? '' : 's'} from file.`);
      setTimeout(() => setImportMessage(null), 3000);
    } catch (e) {
      setImportMessage('Could not read file. Try CSV, PDF, or plain text.');
      setTimeout(() => setImportMessage(null), 3000);
    }
  };

  const monthStart = startOfMonthISO();
  const monthToDateSpend = transactions
    .filter((t) => t.dateISO >= monthStart)
    .reduce((sum, t) => sum + t.amountCents, 0);
  const recentTx = transactions.slice(0, 10);

  return (
    <TabScreenAnimation>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>Spend</Text>
        <View style={styles.quickAddWrap}>
          <SmartInputBar
            context="money"
            onSubmit={handleSmartInputSubmit}
            loading={smartInputLoading}
          />
        </View>
        <View style={[styles.heroCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>This month</Text>
          <Text style={[styles.heroValue, { color: theme.text }]}>{formatCurrency(monthToDateSpend)}</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Subscription Waste Detector</Text>
        <SubscriptionWasteCard subscriptions={subscriptions} lifeItems={items} />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Import from statement</Text>
        <View style={[styles.statementCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statementHint, { color: theme.textTertiary }]}>
            Pick a file (PDF, CSV, or text — e.g. bank statement export), or paste lines below. We'll analyze and categorize transactions.
          </Text>
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: theme.tint }]}
            onPress={handlePickFile}
          >
            <Text style={styles.importButtonText}>Pick file</Text>
          </TouchableOpacity>
          <Text style={[styles.statementHint, { color: theme.textTertiary, marginTop: spacing.md }]}>
            Or paste lines (one per line): "Starbucks $5.50" or "Shell Gas 45.00"
          </Text>
          <TextInput
            style={[styles.statementInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
            placeholder={"Starbucks $5.50\nShell Gas 45.00\nAmazon 32.99"}
            placeholderTextColor={theme.textTertiary}
            value={statementText}
            onChangeText={setStatementText}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: theme.accentPill }]}
            onPress={handleImportStatement}
          >
            <Text style={[styles.importButtonText, { color: theme.tint }]}>Analyze & add from text</Text>
          </TouchableOpacity>
          {importMessage != null && (
            <Text style={[styles.importMessage, { color: theme.tint }]}>{importMessage}</Text>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Recent</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {recentTx.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textTertiary }]}>No transactions yet</Text>
          ) : (
            recentTx.map((t, i) => (
              <View key={`tx-${t.id}-${i}`} style={[styles.txRow, i === 0 && styles.txRowFirst, { borderTopColor: theme.border }]}>
                <View style={styles.txLeft}>
                  <Text style={[styles.txTitle, { color: theme.text }]} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={[styles.txMeta, { color: theme.textTertiary }]}>
                    {t.dateISO} {t.merchant ? `· ${t.merchant}` : ''}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: theme.text }]}>
                  {formatCurrency(t.amountCents)}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Subscriptions</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {subscriptions.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textTertiary }]}>No subscriptions</Text>
          ) : (
            subscriptions.map((s, i) => (
              <View key={`sub-${s.id}-${i}`} style={[styles.txRow, i === 0 && styles.txRowFirst, { borderTopColor: theme.border }]}>
                <View style={styles.txLeft}>
                  <Text style={[styles.txTitle, { color: theme.text }]}>{s.title}</Text>
                  <Text style={[styles.txMeta, { color: theme.textTertiary }]}>
                    {s.cadence} · Next: {s.nextDueISO}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: theme.text }]}>
                  {formatCurrency(s.amountCents)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

        <AddItemSheet
          bottomSheetRef={addItemRef}
          onSubmit={handleAddItem}
          editItem={selectedItem}
          onUpdate={handleUpdateItem}
          initialTitle={draftQuickAdd ?? undefined}
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
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingTop: spacing.lg },
  pageTitle: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.6,
    marginBottom: spacing.lg,
  },
  quickAddWrap: { marginBottom: spacing.xl },
  heroCard: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    marginBottom: spacing.xl,
  },
  heroLabel: { fontSize: 13, fontWeight: '500', marginBottom: spacing.xs },
  heroValue: { fontSize: 32, fontWeight: '600', letterSpacing: -0.8 },
  statementCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
  },
  statementHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  statementInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  importButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  importButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  importMessage: { fontSize: 13, marginTop: spacing.sm },
  card: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    letterSpacing: 0.2,
  },
  empty: { fontSize: 15 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  txRowFirst: { borderTopWidth: 0 },
  txLeft: { flex: 1 },
  txTitle: { fontSize: 15, fontWeight: '500' },
  txMeta: { fontSize: 13, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '500' },
});
