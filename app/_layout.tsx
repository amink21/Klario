import 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { StartupAnimation } from '@/components/StartupAnimation';
import { useColorScheme } from '@/components/useColorScheme';
import { useStore } from '@/lib/store';
import { getHasOnboarded, setHasOnboarded } from '@/lib/onboardingStorage';
import { hasSeeded, setSeeded } from '@/lib/storage';
import { defaultSettings } from '@/lib/seed';
import {
  setLifeItems,
  setTransactions,
  setSubscriptions,
  setSettings,
} from '@/lib/storage';
import { updateMorningBriefSchedule } from '@/lib/notifications';
import { runNudgeScheduler } from '@/lib/nudges';
import { MorningBriefModal } from '@/components/MorningBriefModal';
import { ReminderCompletedModal } from '@/components/ReminderCompletedModal';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [startupDone, setStartupDone] = useState(false);
  const [hasOnboarded, setHasOnboardedState] = useState<boolean | null>(null);
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

  useEffect(() => {
    if (!loaded) return;
    getHasOnboarded().then(setHasOnboardedState);
  }, [loaded]);

  if (!loaded) return null;

  if (hasOnboarded === null) {
    return <GestureHandlerRootView style={{ flex: 1 }} />;
  }

  if (hasOnboarded === false) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <OnboardingScreen
          onComplete={() => {
            setHasOnboarded().then(() => {
              setHasOnboardedState(true);
              setStartupDone(true);
            });
          }}
        />
      </GestureHandlerRootView>
    );
  }

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
  const setReminderNotificationItemId = useStore((s) => s.setReminderNotificationItemId);

  useEffect(() => {
    (async () => {
      const seeded = await hasSeeded();
      if (!seeded) {
        await setLifeItems([]);
        await setTransactions([]);
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
  // Run only after app has loaded so (tabs) is mounted and navigation works.
  useEffect(() => {
    if (!loaded) return;

    function handleNotificationResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data) return;

      // Navigate to Today tab first (valid route); then open modal/sheet.
      router.replace('/');
      if (data.type === 'morning_brief') {
        setShowMorningBriefModal(true);
        return;
      }

      if (data.type === 'due_reminder' && data.itemId) {
        setReminderNotificationItemId(data.itemId);
        return;
      }

      if (data.itemId) {
        setDeepLinkItemId(data.itemId);
      }
    }

    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Cold start: app opened from notification tap.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    });

    return () => sub.remove();
  }, [loaded, router, setShowMorningBriefModal, setDeepLinkItemId, setReminderNotificationItemId]);

  return (
    <BottomSheetModalProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="transaction/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="quick-add" options={{ headerShown: false }} />
          <Stack.Screen name="quick-add-setup" options={{ headerShown: false }} />
        </Stack>
        <MorningBriefModal />
        <ReminderCompletedModal />
      </ThemeProvider>
    </BottomSheetModalProvider>
  );
}
