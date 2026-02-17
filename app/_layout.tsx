import 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
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
  const load = useStore((s) => s.load);
  const settings = useStore((s) => s.settings);

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

  useEffect(() => {
    if (settings?.morningBrief != null) {
      updateMorningBriefSchedule({
        morningBrief: settings.morningBrief,
        morningBriefTime: settings.morningBriefTime ?? '07:00',
      });
    }
  }, [settings?.morningBrief, settings?.morningBriefTime]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
