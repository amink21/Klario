import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConnected } from '@/lib/supabase';
import { colors, spacing, radius } from '@/constants/Theme';
import {
  getSettings,
  setSettings as setSettingsStorage,
  resetAllData,
  setSeeded,
} from '@/lib/storage';
import {
  demoLifeItems,
  demoTransactions,
  demoSubscriptions,
  defaultSettings,
} from '@/lib/seed';
import {
  setLifeItems,
  setTransactions,
  setSubscriptions,
  setSettings,
} from '@/lib/storage';
import Constants from 'expo-constants';
import {
  runAITest,
  runAllAITests,
  runMorningBriefTest,
} from '@/lib/ai/testHelpers';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const settings = useStore((s) => s.settings);
  const setSettingsStore = useStore((s) => s.setSettings);
  const load = useStore((s) => s.load);
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const { session, signInWithPassword, signUp, signOut } = useAuth();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleSignIn = async () => {
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Email and password required');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await signInWithPassword(authEmail.trim(), authPassword);
    setAuthLoading(false);
    if (error) setAuthError(error.message);
    else await load();
  };

  const handleSignUp = async () => {
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Email and password required');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await signUp(authEmail.trim(), authPassword);
    setAuthLoading(false);
    if (error) setAuthError(error.message);
    else await load();
  };

  const handleSignOut = async () => {
    await signOut();
    await load();
  };

  const handleMorningBrief = async (value: boolean) => {
    const next = { ...settings!, morningBrief: value };
    await setSettingsStorage(next);
    await setSettingsStore(next);
  };

  const handleDueReminders = async (value: boolean) => {
    const next = { ...settings!, dueItemReminders: value };
    await setSettingsStorage(next);
    await setSettingsStore(next);
  };

  const handleDefaultRemind = async (value: 7 | 14 | 30) => {
    const next = { ...settings!, defaultRemindDaysBefore: value };
    await setSettingsStorage(next);
    await setSettingsStore(next);
  };

  const handleResetDemo = () => {
    Alert.alert(
      'Reset demo data',
      'Replace all your data with sample items, transactions, and subscriptions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            await setLifeItems(demoLifeItems());
            await setTransactions(demoTransactions());
            await setSubscriptions(demoSubscriptions());
            await setSettings(defaultSettings());
            await setSeeded();
            await load();
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear all data',
      'Permanently delete all items, transactions, and subscriptions. You will start with an empty app. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            await load();
          },
        },
      ]
    );
  };

  const handleTestAI = async () => {
    setAiTestLoading(true);
    try {
      const result = await runAITest();
      Alert.alert(
        result.ok ? 'AI test (Smart Add)' : 'AI error',
        result.ok ? result.message : result.error
      );
    } finally {
      setAiTestLoading(false);
    }
  };

  const handleTestMorningBrief = async () => {
    setAiTestLoading(true);
    try {
      const result = await runMorningBriefTest();
      Alert.alert(
        result.ok ? 'Morning brief' : 'AI error',
        result.ok ? result.message : result.error
      );
    } finally {
      setAiTestLoading(false);
    }
  };

  const handleTestAllAI = async () => {
    setAiTestLoading(true);
    try {
      const result = await runAllAITests();
      Alert.alert(
        result.ok ? 'All AI features' : 'AI error',
        result.ok ? result.message : result.error
      );
    } finally {
      setAiTestLoading(false);
    }
  };

  const s = settings ?? defaultSettings();
  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest?.version ?? '1.0.0';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>Settings</Text>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {!isSupabaseConnected() ? (
            <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file in the project root, then restart the app (npm start) to sign in and sync data to the cloud.
            </Text>
          ) : session?.user ? (
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Text style={[styles.label, { color: theme.text }]}>Signed in as {session.user.email}</Text>
              </View>
              <TouchableOpacity style={[styles.authBtn, { backgroundColor: theme.danger }]} onPress={handleSignOut}>
                <Text style={styles.authBtnText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={[styles.authInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Email"
                placeholderTextColor={theme.textTertiary}
                value={authEmail}
                onChangeText={setAuthEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={[styles.authInput, { color: theme.text, borderColor: theme.border, marginTop: spacing.sm }]}
                placeholder="Password"
                placeholderTextColor={theme.textTertiary}
                value={authPassword}
                onChangeText={setAuthPassword}
                secureTextEntry
              />
              {authError != null && (
                <Text style={[styles.subtitle, { color: theme.danger, marginTop: spacing.xs }]}>{authError}</Text>
              )}
              <View style={styles.authBtnRow}>
                <TouchableOpacity
                  style={[styles.authBtn, { backgroundColor: theme.tint }]}
                  onPress={handleSignIn}
                  disabled={authLoading}
                >
                  <Text style={styles.authBtnText}>{authLoading ? '…' : 'Sign in'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.authBtn, { backgroundColor: theme.pillBg }]}
                  onPress={handleSignUp}
                  disabled={authLoading}
                >
                  <Text style={[styles.authBtnText, { color: theme.text }]}>Sign up</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.subtitle, { color: theme.textTertiary, marginTop: spacing.sm }]}>
                Sign in to sync your data to the cloud.
              </Text>
            </>
          )}
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Notifications
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Text style={[styles.label, { color: theme.text }]}>
                Morning brief
              </Text>
              <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
                Daily summary of what’s due and upcoming
              </Text>
            </View>
            <Switch
              value={s.morningBrief}
              onValueChange={handleMorningBrief}
              trackColor={{ false: theme.pillBg, true: theme.tint }}
              thumbColor="#fff"
            />
          </View>
          <View
            style={[
              styles.settingRow,
              styles.rowBorder,
              { borderTopColor: theme.border },
            ]}
          >
            <View style={styles.settingLabelWrap}>
              <Text style={[styles.label, { color: theme.text }]}>
                Due item reminders
              </Text>
              <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
                Get notified before bills and tasks are due
              </Text>
            </View>
            <Switch
              value={s.dueItemReminders}
              onValueChange={handleDueReminders}
              trackColor={{ false: theme.pillBg, true: theme.tint }}
              thumbColor="#fff"
            />
          </View>
          <View
            style={[
              styles.settingRowColumn,
              styles.rowBorder,
              { borderTopColor: theme.border },
            ]}
          >
            <View style={styles.settingLabelWrap}>
              <Text style={[styles.label, { color: theme.text }]}>
                Default reminder lead time
              </Text>
              <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
                How many days before a due date to remind (for new items)
              </Text>
            </View>
            <View style={styles.pills}>
              {([7, 14, 30] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.pill,
                    {
                      backgroundColor:
                        s.defaultRemindDaysBefore === d
                          ? theme.tint
                          : theme.pillBg,
                    },
                  ]}
                  onPress={() => handleDefaultRemind(d)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color:
                          s.defaultRemindDaysBefore === d ? '#fff' : theme.text,
                      },
                    ]}
                  >
                    {d} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Data */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Data
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleResetDemo}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { color: theme.text }]}>
              Reset demo data
            </Text>
            <Text style={[styles.actionHint, { color: theme.textTertiary }]}>
              Load sample items & transactions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionRow,
              styles.actionRowBorder,
              { borderTopColor: theme.border },
            ]}
            onPress={handleClearAllData}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { color: theme.danger }]}>
              Clear all data
            </Text>
            <Text style={[styles.actionHint, { color: theme.textTertiary }]}>
              Delete everything permanently
            </Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          About
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.label, { color: theme.text }]}>App</Text>
            <Text style={[styles.value, { color: theme.textSecondary }]}>
              Klario
            </Text>
          </View>
          <View
            style={[
              styles.settingRow,
              styles.rowBorder,
              { borderTopColor: theme.border },
            ]}
          >
            <Text style={[styles.label, { color: theme.text }]}>Version</Text>
            <Text style={[styles.value, { color: theme.textSecondary }]}>
              {appVersion}
            </Text>
          </View>
        </View>

        {/* Developer – Test AI */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Developer
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleTestAI}
            disabled={aiTestLoading}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { color: theme.tint }]}>
              {aiTestLoading ? 'Testing…' : 'Test AI (Smart Add)'}
            </Text>
            <Text style={[styles.actionHint, { color: theme.textTertiary }]}>
              Parse “Car insurance March 12 yearly $1400”
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionRow,
              styles.actionRowBorder,
              { borderTopColor: theme.border },
            ]}
            onPress={handleTestMorningBrief}
            disabled={aiTestLoading}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { color: theme.tint }]}>
              Test morning brief
            </Text>
            <Text style={[styles.actionHint, { color: theme.textTertiary }]}>
              Generate 1–4 calm summary lines
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionRow,
              styles.actionRowBorder,
              { borderTopColor: theme.border },
            ]}
            onPress={handleTestAllAI}
            disabled={aiTestLoading}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { color: theme.tint }]}>
              Test all AI features
            </Text>
            <Text style={[styles.actionHint, { color: theme.textTertiary }]}>
              Smart Add + category + brief + subscription (one summary)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingRowColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  settingLabelWrap: { flex: 1, marginRight: spacing.md },
  rowBorder: { borderTopWidth: 1, paddingTop: spacing.md, marginTop: spacing.md },
  label: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  value: { fontSize: 15, fontWeight: '500' },
  pills: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  pillText: { fontSize: 14, fontWeight: '500' },
  actionRow: { paddingVertical: spacing.sm },
  actionRowBorder: { borderTopWidth: 1, marginTop: spacing.xs },
  actionLabel: { fontSize: 16, fontWeight: '600' },
  actionHint: { fontSize: 13, marginTop: 2 },
  authInput: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, fontSize: 16 },
  authBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.lg, alignItems: 'center' },
  authBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  authBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
