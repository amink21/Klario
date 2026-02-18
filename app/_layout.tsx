import 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { StartupAnimation } from '@/components/StartupAnimation';
import { useColorScheme } from '@/components/useColorScheme';
import { useStore } from '@/lib/store';
import { hasSeeded, setSeeded } from '@/lib/storage';
import { demoLifeItems, demoTransactions, demoSubscriptions, defaultSettings } from '@/lib/seed';
import {
  setLifeItems,
  setTransactions,
  setSubscriptions,
  setSettings,
} from '@/lib/storage';
import { updateMorningBriefSchedule } from '@/lib/notifications';
import { runNudgeScheduler } from '@/lib/nudges';
import { MorningBriefModal } from '@/components/MorningBriefModal';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [startupDone, setStartupDone] = useState(false);
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Poppins_800ExtraBold: require('../assets/fonts/Poppins_800ExtraBold.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
        {!startupDone && (
          <StartupAnimation onFinish={() => setStartupDone(true)} />
        )}
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const load = useStore((s) => s.load);
  const loaded = useStore((s) => s.loaded);
  const settings = useStore((s) => s.settings);
  const setShowMorningBriefModal = useStore((s) => s.setShowMorningBriefModal);
  const setDeepLinkItemId = useStore((s) => s.setDeepLinkItemId);

  useEffect(() => {
    (async () => {
      const seeded = await hasSeeded();
      if (!seeded) {
        await setLifeItems(demoLifeItems());
        await setTransactions(demoTransactions());
        await setSubscriptions([]);
        await setSettings(defaultSettings());
        await setSeeded();
      }
      await load();
    })();
  }, [load]);

  // Smart nudges: schedule one contextual notification (spending, statement, positive) on app open.
  useEffect(() => {
    if (!loaded || !settings) return;
    const { items, transactions, subscriptions } = useStore.getState();
    runNudgeScheduler({ items, transactions, subscriptions, settings }).catch(() => {});
  }, [loaded, settings]);

  useEffect(() => {
    if (settings?.morningBrief != null) {
      updateMorningBriefSchedule({
        morningBrief: settings.morningBrief,
        morningBriefTime: settings.morningBriefTime ?? '07:00',
      });
    }
  }, [settings?.morningBrief, settings?.morningBriefTime]);

  // Deep link: handle notification tap (foreground/background) and cold start.
  useEffect(() => {
    function handleNotificationResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data) return;

      if (data.type === 'morning_brief') {
        setShowMorningBriefModal(true);
        router.replace('/(tabs)/today');
        return;
      }

      if (data.type === 'due_reminder' && data.itemId) {
        setDeepLinkItemId(data.itemId);
        router.replace('/(tabs)/today');
        return;
      }

      // Legacy: due reminders that only have itemId (no type).
      if (data.itemId) {
        setDeepLinkItemId(data.itemId);
        router.replace('/(tabs)/today');
      }
    }

    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Cold start: app opened from notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    });

    return () => sub.remove();
  }, [router, setShowMorningBriefModal, setDeepLinkItemId]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <MorningBriefModal />
    </ThemeProvider>
  );
}
