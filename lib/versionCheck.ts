/**
 * Check if a newer app version is available on the store.
 * iOS: uses iTunes Lookup API (no backend). Android: optional future Supabase config.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const LAST_UPDATE_PROMPT_KEY = '@klovio_last_update_prompt_version';

export async function getLastUpdatePromptVersion(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_UPDATE_PROMPT_KEY);
}

export async function setLastUpdatePromptVersion(storeVersion: string): Promise<void> {
  await AsyncStorage.setItem(LAST_UPDATE_PROMPT_KEY, storeVersion);
}

export type VersionCheckResult =
  | { updateAvailable: true; storeUrl: string; storeVersion: string }
  | { updateAvailable: false };

const IOS_BUNDLE_ID = Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.amin123786.klovio';

/** Fetch your app's App Store page URL from iTunes Lookup (iOS only). Returns null if not found or on Android. */
export async function getAppStoreUrl(): Promise<{ storeUrl: string; storeVersion: string } | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(IOS_BUNDLE_ID)}`
    );
    const data = (await res.json()) as { results?: Array<{ version?: string; trackViewUrl?: string }> };
    const app = data?.results?.[0];
    const storeUrl = app?.trackViewUrl;
    const storeVersion = app?.version;
    if (storeUrl && storeVersion) return { storeUrl, storeVersion };
  } catch {
    // ignore
  }
  return null;
}

/** Compare two version strings (e.g. "1.1.5" vs "1.1.6"). Returns true if storeVersion > currentVersion. */
function isNewerVersion(current: string, storeVersion: string): boolean {
  const toParts = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
  const cur = toParts(current);
  const store = toParts(storeVersion);
  const len = Math.max(cur.length, store.length);
  for (let i = 0; i < len; i++) {
    const c = cur[i] ?? 0;
    const s = store[i] ?? 0;
    if (s > c) return true;
    if (s < c) return false;
  }
  return false;
}

/** Check App Store (iOS) or return no update (Android). */
export async function checkForUpdate(): Promise<VersionCheckResult> {
  const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

  if (Platform.OS === 'ios') {
    try {
      const res = await fetch(
        `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(IOS_BUNDLE_ID)}`
      );
      const data = (await res.json()) as { resultCount?: number; results?: Array<{ version?: string; trackViewUrl?: string }> };
      const app = data?.results?.[0];
      const storeVersion = app?.version;
      const storeUrl = app?.trackViewUrl;
      if (storeVersion && storeUrl && isNewerVersion(currentVersion, storeVersion)) {
        return { updateAvailable: true, storeUrl, storeVersion };
      }
    } catch {
      // Network or parse error: don't prompt, fail silently
    }
  }

  // Android: no public Play Store API; you could add a Supabase app_config table later
  return { updateAvailable: false };
}
