import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { useStore } from '@/lib/store';
import { generateDailyBrief } from '@/lib/ai/dailyBrief';
import type { DailyBriefInput } from '@/lib/ai/dailyBrief';
import { yesterdayISO, daysUntil } from '@/lib/date';
import { computeUpcomingTotal } from '@/lib/forecast';

export function MorningBriefModal() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const visible = useStore((s) => s.showMorningBriefModal);
  const setShowMorningBriefModal = useStore((s) => s.setShowMorningBriefModal);

  const items = useStore((s) => s.items);
  const transactions = useStore((s) => s.transactions);
  const subscriptions = useStore((s) => s.subscriptions);

  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch brief only when modal opens; use store state at open time to avoid multiple Gemini calls.
  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    setError(null);

    const { items: currentItems, transactions: currentTx, subscriptions: currentSubs } = useStore.getState();

    function buildBriefInput(): DailyBriefInput {
      const yesterday = yesterdayISO();
      const yesterdayTx = currentTx.filter((t) => t.dateISO === yesterday);
      const yesterdaySpend = yesterdayTx.reduce((sum, t) => sum + (t.amountCents > 0 ? t.amountCents : 0), 0);

      const byCategory: Record<string, number> = {};
      yesterdayTx.forEach((t) => {
        if (t.amountCents > 0) {
          byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amountCents;
        }
      });
      const topSpendCategory =
        Object.keys(byCategory).length > 0
          ? Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]![0]
          : 'Other';

      const activeItems = currentItems.filter((i) => i.status === 'active');
      const dueIn7Items = activeItems.filter((i) => {
        const d = daysUntil(i.nextDueISO);
        return d >= 0 && d <= 7;
      });
      const dueIn7Subs = currentSubs.filter((s) => {
        const d = daysUntil(s.nextDueISO);
        return d >= 0 && d <= 7;
      });
      const dueSoonCount = dueIn7Items.length + dueIn7Subs.length;

      const overdueCount =
        activeItems.filter((i) => daysUntil(i.nextDueISO) < 0).length +
        currentSubs.filter((s) => daysUntil(s.nextDueISO) < 0).length;

      const dueNext7Days = [
        ...dueIn7Items
          .sort((a, b) => a.nextDueISO.localeCompare(b.nextDueISO))
          .map((i) => ({
            title: i.title,
            dateISO: i.nextDueISO,
            amountCents: i.amountCents,
          })),
        ...dueIn7Subs
          .sort((a, b) => a.nextDueISO.localeCompare(b.nextDueISO))
          .map((s) => ({
            title: s.title,
            dateISO: s.nextDueISO,
            amountCents: s.amountCents,
          })),
      ].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

      const forecastAmount = computeUpcomingTotal(activeItems, currentSubs, 30);

      const upcomingItems = [...activeItems]
        .sort((a, b) => a.nextDueISO.localeCompare(b.nextDueISO))
        .slice(0, 5)
        .map((i) => ({ title: i.title, nextDueISO: i.nextDueISO }));

      return {
        upcomingItems,
        dueSoonCount,
        forecastAmount,
        yesterdaySpend,
        topSpendCategory,
        overdueCount,
        dueNext7Days,
      };
    }

    const input = buildBriefInput();
    generateDailyBrief(input)
      .then((result) => {
        setLines(result.lines);
        setLoading(false);
      })
      .catch((e) => {
        setError((e as Error).message ?? 'Could not load brief');
        setLoading(false);
      });
    // Only run when modal becomes visible; avoid re-running when items/transactions change (prevents 429).
  }, [visible]);

  const handleClose = () => setShowMorningBriefModal(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Morning brief</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <Text style={[styles.closeText, { color: theme.tint }]}>Close</Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={theme.tint} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Preparing your summary…
              </Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.content}>
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            </View>
          )}

          {!loading && !error && lines.length > 0 && (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {lines.map((line, i) => (
                <Text
                  key={i}
                  style={[styles.line, { color: theme.text }]}
                >
                  {line}
                </Text>
              ))}
            </ScrollView>
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
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingWrap: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  content: {
    padding: spacing.lg,
  },
  errorText: {
    fontSize: 14,
  },
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  line: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
});
