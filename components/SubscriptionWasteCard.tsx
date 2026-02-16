import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { formatCurrency } from '@/lib/currency';
import {
  runSubscriptionWasteAnalysis,
  buildSubscriptionWastePayload,
} from '@/lib/ai/subscriptionWaste';
import type { SubscriptionWasteResult } from '@/lib/ai/schemas';
import type { LifeItem, Subscription } from '@/lib/types';

interface SubscriptionWasteCardProps {
  subscriptions: Subscription[];
  lifeItems: LifeItem[];
}

export function SubscriptionWasteCard({ subscriptions, lifeItems }: SubscriptionWasteCardProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubscriptionWasteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payload = buildSubscriptionWastePayload(subscriptions, lifeItems);
  const hasItems = payload.items.length > 0;

  const handleRun = async () => {
    if (!hasItems) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const outcome = await runSubscriptionWasteAnalysis(subscriptions, lifeItems);
    setLoading(false);
    if (outcome.ok) {
      setResult(outcome.data);
    } else {
      setError(outcome.error);
    }
  };

  if (!hasItems) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.header}>
          <FontAwesome name="fire" size={18} color={theme.warning} />
          <Text style={[styles.title, { color: theme.text }]}>Subscription Waste Detector</Text>
        </View>
        <Text style={[styles.hint, { color: theme.textTertiary }]}>
          Add subscriptions or recurring bills to see insights — e.g. multiple streaming services or high cost per category.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <FontAwesome name="fire" size={18} color={theme.warning} />
        <Text style={[styles.title, { color: theme.text }]}>Subscription Waste Detector</Text>
      </View>
      {!result && !error && (
        <Text style={[styles.hint, { color: theme.textTertiary }]}>
          AI scans for unused subs, high cost per use, and multiple similar services.
        </Text>
      )}
      {error != null && (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      )}
      {result != null && (
        <View style={styles.result}>
          {result.summaryLines.map((line, i) => (
            <Text key={i} style={[styles.summaryLine, { color: theme.text }]}>
              • {line}
            </Text>
          ))}
          {result.groups.length > 0 && (
            <View style={styles.groups}>
              {result.groups.map((g, i) => (
                <View key={i} style={[styles.groupRow, { borderTopColor: theme.border }]}>
                  <Text style={[styles.groupName, { color: theme.text }]}>{g.groupName}</Text>
                  <Text style={[styles.groupAmount, { color: theme.textSecondary }]}>
                    {formatCurrency(g.totalMonthlyCents)}/mo · {g.count} service{g.count !== 1 ? 's' : ''}
                  </Text>
                  {g.insight ? (
                    <Text style={[styles.groupInsight, { color: theme.textTertiary }]}>{g.insight}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          {result.potentialSavingsCents != null && result.potentialSavingsCents > 0 && (
            <Text style={[styles.savings, { color: theme.tint }]}>
              Potential savings ~{formatCurrency(result.potentialSavingsCents)}/mo
            </Text>
          )}
        </View>
      )}
      {hasItems && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.warning }]}
          onPress={handleRun}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome name="magic" size={16} color="#fff" style={styles.btnIcon} />
              <Text style={styles.buttonText}>{result ? 'Run again' : 'Run analysis'}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  error: {
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  result: {
    marginBottom: spacing.md,
  },
  summaryLine: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  groups: {
    marginTop: spacing.sm,
  },
  groupRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupAmount: {
    fontSize: 13,
    marginTop: 2,
  },
  groupInsight: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  savings: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  btnIcon: {
    marginRight: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
