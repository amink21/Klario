import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, spacing, radius } from '@/constants/Theme';
import { useStore } from '@/lib/store';
import { daysUntil, startOfMonthISO } from '@/lib/date';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

const SEGMENT_COLORS = ['#e8a54b', '#b87fa8', '#c9a227'] as const;

const TABS: { route: 'today' | 'items' | 'money'; icon: IconName }[] = [
  { route: 'today', icon: 'calendar' },
  { route: 'items', icon: 'list' },
  { route: 'money', icon: 'dollar' },
];

export function SummaryPillBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const items = useStore((s) => s.items);
  const transactions = useStore((s) => s.transactions);

  const activeCount = items.filter((i) => i.status === 'active').length;
  const dueSoonCount = items.filter((i) => {
    if (i.status !== 'active') return false;
    const d = daysUntil(i.nextDueISO);
    return d >= 0 && d <= 14;
  }).length;
  const monthStart = startOfMonthISO();
  const monthSpend = transactions
    .filter((t) => t.dateISO >= monthStart)
    .reduce((sum, t) => sum + t.amountCents, 0);

  const monthDisplay =
    monthSpend >= 100000
      ? `$${(monthSpend / 100000).toFixed(1).replace(/\.0$/, '')}k`
      : `$${Math.round(monthSpend / 100)}`;

  const values = [String(dueSoonCount), String(activeCount), monthDisplay];
  const currentRoute = props.state.routes[props.state.index]?.name ?? 'today';

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      <View style={[styles.pill, { backgroundColor: theme.surfaceElevated ?? theme.surface }]}>
        {TABS.map((tab, index) => {
          const isActive = currentRoute === tab.route;
          return (
            <React.Fragment key={tab.route}>
              {index > 0 && (
                <Text style={[styles.dot, { color: theme.textTertiary }]}>·</Text>
              )}
              <TouchableOpacity
                style={styles.segmentTouch}
                onPress={() => props.navigation.navigate(tab.route)}
                activeOpacity={0.6}
              >
                <View style={[styles.segment, isActive && styles.segmentActive]}>
                  <FontAwesome
                    name={tab.icon}
                    size={14}
                    color={isActive ? theme.tint : SEGMENT_COLORS[index]}
                    style={styles.icon}
                  />
                  <Text
                    style={[
                      styles.number,
                      { color: isActive ? theme.tint : theme.text },
                    ]}
                    numberOfLines={1}
                  >
                    {values[index]}
                  </Text>
                </View>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentTouch: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
    borderRadius: radius.md,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentActive: {
    opacity: 1,
  },
  icon: {
    width: 18,
    textAlign: 'center',
  },
  number: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    minWidth: 20,
  },
  dot: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 2,
  },
});
