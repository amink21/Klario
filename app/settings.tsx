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
  Platform,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
  updateMorningBriefSchedule,
  previewMorningBriefNotification,
  previewDueReminderNotification,
  cancelNudgeNotifications,
} from '@/lib/notifications';
import { normalizeDueTime } from '@/lib/date';

/** Parse "HH:mm" to Date (today at that time). */
function timeStringToDate(s: string): Date {
  const [h, m] = (s || '07:00').split(':').map((x) => parseInt(x, 10) || 0);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Format Date to "HH:mm". */
function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const PRESET_REMIND_DAYS = [1, 7, 14, 30] as const;

const SUPPORT_EMAIL = 'getklario@gmail.com';

const SUPPORT_OPTIONS: { id: string; label: string; subject: string }[] = [
  { id: 'bug', label: 'Bug report', subject: 'Klario App: Bug Report' },
  { id: 'feature', label: 'Feature request', subject: 'Klario App: Feature Request' },
  { id: 'request', label: 'General request', subject: 'Klario App: General Request' },
  { id: 'billing', label: 'Billing / Account', subject: 'Klario App: Billing / Account' },
  { id: 'other', label: 'Other', subject: 'Klario App: Support' },
];

/** Same policy as web (website/privacy.html). */
const PRIVACY_POLICY_SECTIONS = [
  { title: 'Overview', body: 'Klario ("we", "our", or "the app") is designed to keep your reminders, spending, and subscriptions in one place. We care about your privacy and aim to store only what\'s needed to run the app and, if you choose, to sync your data to the cloud.' },
  { title: 'Data we collect and use', body: '• Account data. If you sign in (e.g. with email and password), we store your account credentials and a unique identifier so you can sync data across devices.\n\n• Synced content. When you sign in, items (reminders, bills), transactions, and app settings may be stored on our servers so you can access them from other devices. This data is tied to your account.\n\n• Subscriptions. Subscription lists are stored only on your device and are not synced to our servers.\n\n• Import and processing. If you use file or PDF import, the file content may be sent to our backend or a third-party service to extract text or transactions. We do not use this content for advertising or unrelated purposes.' },
  { title: 'Data we do not sell', body: 'We do not sell your personal data or synced content to third parties for advertising or marketing.' },
  { title: 'Security', body: 'We use industry-standard practices (including encryption in transit and, where applicable, at rest) to protect your account and synced data. You are responsible for keeping your sign-in credentials secure.' },
  { title: 'Your choices', body: '• You can use the app without signing in; in that case, all data stays on your device.\n\n• You can sign out or delete your account; we will delete or anonymize your account and synced data in line with our retention policy.\n\n• You can clear all data or reset demo data from the app\'s Settings at any time.' },
  { title: 'Children', body: 'Klario is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have received such information, please contact us and we will delete it.' },
  { title: 'Changes', body: 'We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the "Last updated" date. Continued use of the app after changes constitutes acceptance of the updated policy.' },
  { title: 'Contact', body: `Questions about this Privacy Policy or our practices can be sent to ${SUPPORT_EMAIL}.` },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const settings = useStore((s) => s.settings);
  const setSettingsStore = useStore((s) => s.setSettings);
  const setSubscriptionsStore = useStore((s) => s.setSubscriptions);
  const load = useStore((s) => s.load);
  const [customRemindDays, setCustomRemindDays] = useState<string>('');
  const { session, signInWithPassword, signUp, signOut } = useAuth();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showBriefTimePicker, setShowBriefTimePicker] = useState(false);
  const [briefTimePickerValue, setBriefTimePickerValue] = useState(() =>
    timeStringToDate('07:00')
  );
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This will permanently delete your account and all your data (reminders, transactions, subscriptions, settings). This cannot be undone and there is no way to get it back.\n\nAre you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            await signOut();
            await load();
          },
        },
      ]
    );
  };

  const openSupportModal = () => setShowSupportModal(true);
  const openPrivacyPolicy = () => setShowPrivacyModal(true);

  const openSupportEmail = (subject: string) => {
    setShowSupportModal(false);
    const body = 'Please describe your issue or request below:\n\n';
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  const handleMorningBrief = async (value: boolean) => {
    const next = { ...settings!, morningBrief: value };
    await setSettingsStorage(next);
    await setSettingsStore(next);
    await updateMorningBriefSchedule(next);
  };

  const handleMorningBriefTime = async (raw: string) => {
    let value = raw.trim();
    if (value && !value.includes(':')) {
      const h = parseInt(value, 10);
      if (!isNaN(h) && h >= 0 && h <= 23) value = `${String(h).padStart(2, '0')}:00`;
    }
    const normalized = normalizeDueTime(value) ?? settings!.morningBriefTime ?? '07:00';
    const next = { ...settings!, morningBriefTime: normalized };
    await setSettingsStorage(next);
    await setSettingsStore(next);
    await updateMorningBriefSchedule(next);
  };

  const handleDueReminders = async (value: boolean) => {
    const next = { ...settings!, dueItemReminders: value };
    await setSettingsStorage(next);
    await setSettingsStore(next);
  };

  const handleSmartNudges = async (value: boolean) => {
    const next = { ...settings!, smartNudges: value };
    await setSettingsStorage(next);
    await setSettingsStore(next);
    if (!value) await cancelNudgeNotifications();
  };

  const handleDefaultRemind = async (value: number) => {
    const clamped = Math.min(365, Math.max(1, value));
    const next = { ...settings!, defaultRemindDaysBefore: clamped };
    await setSettingsStorage(next);
    await setSettingsStore(next);
    if (PRESET_REMIND_DAYS.includes(clamped as 1 | 7 | 14 | 30)) setCustomRemindDays('');
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
            await setSubscriptions([]);
            await setSettings(defaultSettings());
            await setSeeded();
            await load();
          },
        },
      ]
    );
  };

  const handleClearSubscriptions = () => {
    Alert.alert(
      'Clear subscriptions',
      'Remove all subscriptions from this device? This does not affect transactions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await setSubscriptionsStore([]);
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

  const s = settings ?? defaultSettings();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const defaultRemind = s.defaultRemindDaysBefore;
  const isPreset = PRESET_REMIND_DAYS.includes(defaultRemind as 1 | 7 | 14 | 30);
  const showCustomInput = !isPreset || customRemindDays !== '';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FontAwesome name="chevron-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={styles.headerBack} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {!isSupabaseConnected() ? (
            <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file in the project root, then restart the app (npm start) to sign in and sync data to the cloud.
            </Text>
          ) : session?.user ? (
            <>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Text style={[styles.label, { color: theme.text }]}>Signed in as {session.user.email}</Text>
              </View>
              <TouchableOpacity style={[styles.authBtn, { backgroundColor: theme.danger }]} onPress={handleSignOut}>
                <Text style={styles.authBtnText}>Sign out</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.settingRow, styles.rowBorder, { borderTopColor: theme.border }]}>
              <TouchableOpacity style={styles.linkRow} onPress={openSupportModal} activeOpacity={0.7}>
                <Text style={[styles.label, { color: theme.text }]}>Support</Text>
                <FontAwesome name="external-link" size={12} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.settingRow, styles.rowBorder, { borderTopColor: theme.border }]}>
              <TouchableOpacity style={styles.linkRow} onPress={openPrivacyPolicy} activeOpacity={0.7}>
                <Text style={[styles.label, { color: theme.text }]}>Privacy policy</Text>
                <FontAwesome name="chevron-right" size={12} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.settingRow, styles.rowBorder, { borderTopColor: theme.border }]}>
              <TouchableOpacity style={styles.linkRow} onPress={handleDeleteAccount} activeOpacity={0.7}>
                <Text style={[styles.label, { color: theme.danger }]}>Delete account</Text>
                <FontAwesome name="chevron-right" size={12} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            </>
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
            <View style={[styles.settingRow, styles.rowBorder, { borderTopColor: theme.border, marginTop: spacing.md }]}>
              <TouchableOpacity style={styles.linkRow} onPress={openSupportModal} activeOpacity={0.7}>
                <Text style={[styles.label, { color: theme.text }]}>Support</Text>
                <FontAwesome name="external-link" size={12} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.settingRow, styles.rowBorder, { borderTopColor: theme.border }]}>
              <TouchableOpacity style={styles.linkRow} onPress={openPrivacyPolicy} activeOpacity={0.7}>
                <Text style={[styles.label, { color: theme.text }]}>Privacy policy</Text>
                <FontAwesome name="chevron-right" size={12} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
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
          {s.morningBrief && (
            <View
              style={[
                styles.settingRow,
                styles.rowBorder,
                { borderTopColor: theme.border },
              ]}
            >
              <View style={styles.settingLabelWrap}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Brief time
                </Text>
                <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
                  When to send the notification
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.timeChip, { backgroundColor: theme.pillBg }]}
                onPress={() => {
                  setBriefTimePickerValue(timeStringToDate(s.morningBriefTime ?? '07:00'));
                  setShowBriefTimePicker(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.timeChipText, { color: theme.text }]}>
                  {s.morningBriefTime ?? '07:00'}
                </Text>
                <FontAwesome name="chevron-right" size={12} color={theme.textTertiary} style={styles.timeChipChevron} />
              </TouchableOpacity>
            </View>
          )}
          {showBriefTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={timeStringToDate(settings?.morningBriefTime ?? '07:00')}
              mode="time"
              onChange={(event, date) => {
                setShowBriefTimePicker(false);
                if (event.type === 'dismissed' || !date) return;
                handleMorningBriefTime(dateToTimeString(date));
              }}
              textColor="#000000"
            />
          )}
          {showBriefTimePicker && Platform.OS === 'ios' && (
            <Modal visible transparent animationType="fade">
              <View style={styles.timePickerModalWrap}>
                <Pressable
                  style={[styles.timePickerOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
                  onPress={() => setShowBriefTimePicker(false)}
                />
                <View style={[styles.timePickerSheet, { backgroundColor: theme.surface }]}>
                  <View style={[styles.timePickerHeaderCompact, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity
                      onPress={() => setShowBriefTimePicker(false)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={[styles.timePickerCancel, { color: theme.textTertiary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={[styles.timePickerTitleCompact, { color: theme.text }]}>Time</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        const timeStr = dateToTimeString(briefTimePickerValue);
                        await handleMorningBriefTime(timeStr);
                        setShowBriefTimePicker(false);
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={[styles.timePickerDone, { color: theme.tint }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timePickerWheelWrap}>
                    <DateTimePicker
                      value={briefTimePickerValue}
                      mode="time"
                      onChange={(_, date) => date && setBriefTimePickerValue(date)}
                      display="spinner"
                      textColor="#000000"
                    />
                  </View>
                </View>
              </View>
            </Modal>
          )}
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
              styles.settingRow,
              styles.rowBorder,
              { borderTopColor: theme.border },
            ]}
          >
            <View style={styles.settingLabelWrap}>
              <Text style={[styles.label, { color: theme.text }]}>
                Smart nudges
              </Text>
              <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
                Spending insights, statement reminders, positive check-ins
              </Text>
            </View>
            <Switch
              value={s.smartNudges !== false}
              onValueChange={handleSmartNudges}
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
              {PRESET_REMIND_DAYS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.pill,
                    {
                      backgroundColor:
                        defaultRemind === d ? theme.tint : theme.pillBg,
                    },
                  ]}
                  onPress={() => handleDefaultRemind(d)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: defaultRemind === d ? '#fff' : theme.text },
                    ]}
                  >
                    {d} day{d !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      !isPreset ? theme.tint : theme.pillBg,
                  },
                ]}
                onPress={() => {
                  if (isPreset) setCustomRemindDays(String(defaultRemind));
                }}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: !isPreset ? '#fff' : theme.text },
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
            {showCustomInput && (
              <View style={[styles.customRemindRow, { marginTop: spacing.sm }]}>
                <Text style={[styles.customRemindLabel, { color: theme.textSecondary }]}>
                  Days (1–365):
                </Text>
                <TextInput
                  style={[styles.customRemindInput, { color: theme.text, borderColor: theme.border }]}
                  value={isPreset ? customRemindDays : String(defaultRemind)}
                  onChangeText={(t) => {
                    const n = parseInt(t.replace(/\D/g, ''), 10);
                    if (t === '') setCustomRemindDays('');
                    else if (!Number.isNaN(n)) {
                      setCustomRemindDays(String(n));
                      const clamped = Math.min(365, Math.max(1, n));
                      if (clamped !== defaultRemind) handleDefaultRemind(clamped);
                    }
                  }}
                  placeholder={String(defaultRemind)}
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
            )}
          </View>
          <View
            style={[
              styles.settingRowColumn,
              styles.rowBorder,
              { borderTopColor: theme.border },
            ]}
          >
            <Text style={[styles.label, { color: theme.text, marginBottom: spacing.sm }]}>
              Preview notifications
            </Text>
            <Text style={[styles.subtitle, { color: theme.textTertiary, marginBottom: spacing.md }]}>
              Send a sample notification now to see how it looks
            </Text>
            <View style={styles.previewButtonRow}>
              <TouchableOpacity
                style={[styles.previewButton, { backgroundColor: theme.pillBg }]}
                onPress={async () => {
                  const ok = await previewMorningBriefNotification();
                  if (!ok) Alert.alert('Permission needed', 'Enable notifications in your device settings to preview.');
                }}
                activeOpacity={0.7}
              >
                <FontAwesome name="sun-o" size={18} color={theme.tint} style={styles.previewButtonIcon} />
                <Text style={[styles.previewButtonText, { color: theme.text }]}>
                  Morning brief
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewButton, { backgroundColor: theme.pillBg }]}
                onPress={async () => {
                  const ok = await previewDueReminderNotification();
                  if (!ok) Alert.alert('Permission needed', 'Enable notifications in your device settings to preview.');
                }}
                activeOpacity={0.7}
              >
                <FontAwesome name="bell-o" size={18} color={theme.tint} style={styles.previewButtonIcon} />
                <Text style={[styles.previewButtonText, { color: theme.text }]}>
                  Due reminder
                </Text>
              </TouchableOpacity>
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
            onPress={handleClearSubscriptions}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { color: theme.text }]}>
              Clear subscriptions
            </Text>
            <Text style={[styles.actionHint, { color: theme.textTertiary }]}>
              Remove all subscriptions (e.g. dummy data)
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
      </ScrollView>

      {/* Privacy policy modal – same policy as web, in-app */}
      <Modal visible={showPrivacyModal} animationType="slide" onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Privacy Policy</Text>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.modalClose, { color: theme.tint }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.privacyUpdated, { color: theme.textTertiary }]}>Last updated: February 2026</Text>
            {PRIVACY_POLICY_SECTIONS.map((section, i) => (
              <View key={i} style={styles.privacySection}>
                <Text style={[styles.privacyHeading, { color: theme.text }]}>{section.title}</Text>
                <Text style={[styles.privacyBody, { color: theme.textSecondary }]}>{section.body}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Support modal – choose type then open email to getklario@gmail.com */}
      <Modal visible={showSupportModal} transparent animationType="fade" onRequestClose={() => setShowSupportModal(false)}>
        <Pressable style={styles.supportModalOverlay} onPress={() => setShowSupportModal(false)}>
          <Pressable style={[styles.supportModalCard, { backgroundColor: theme.surfaceElevated }]} onPress={() => {}}>
            <View style={[styles.supportModalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Support</Text>
              <TouchableOpacity onPress={() => setShowSupportModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={[styles.modalClose, { color: theme.tint }]}>Close</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.supportModalHint, { color: theme.textTertiary }]}>Choose a category to open your email with a prefilled subject.</Text>
            {SUPPORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.supportOptionRow, { borderTopColor: theme.border }]}
                onPress={() => openSupportEmail(opt.subject)}
                activeOpacity={0.7}
              >
                <Text style={[styles.label, { color: theme.text }]}>{opt.label}</Text>
                <FontAwesome name="chevron-right" size={12} color={theme.textTertiary} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerBack: {
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingTop: spacing.lg },
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  label: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  value: { fontSize: 15, fontWeight: '500' },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  pillText: { fontSize: 14, fontWeight: '500' },
  previewButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  previewButtonIcon: { marginRight: spacing.sm },
  previewButtonText: { fontSize: 14, fontWeight: '600' },
  actionRow: { paddingVertical: spacing.sm },
  actionRowBorder: { borderTopWidth: 1, marginTop: spacing.xs },
  actionLabel: { fontSize: 16, fontWeight: '600' },
  actionHint: { fontSize: 13, marginTop: 2 },
  authInput: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, fontSize: 16 },
  timeInput: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    minWidth: 80,
    textAlign: 'center',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.lg,
    minWidth: 72,
  },
  timeChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeChipChevron: {
    marginLeft: spacing.xs,
  },
  timePickerModalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  timePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  timePickerSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: 280,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  timePickerHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  timePickerCancel: { fontSize: 15 },
  timePickerTitleCompact: { fontSize: 15, fontWeight: '600' },
  timePickerDone: { fontSize: 15, fontWeight: '600' },
  timePickerWheelWrap: {
    maxHeight: 200,
  },
  customRemindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customRemindLabel: { fontSize: 14 },
  customRemindInput: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    minWidth: 64,
  },
  authBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.lg, alignItems: 'center' },
  authBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  authBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalContainer: { flex: 1, paddingTop: spacing.xxl },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalClose: { fontSize: 16, fontWeight: '500' },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  privacyUpdated: { fontSize: 13, marginBottom: spacing.lg },
  privacySection: { marginBottom: spacing.xl },
  privacyHeading: { fontSize: 17, fontWeight: '600', marginBottom: spacing.sm },
  privacyBody: { fontSize: 15, lineHeight: 22 },
  supportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  supportModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  supportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  supportModalHint: {
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  supportOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
});
