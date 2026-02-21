/**
 * Native Sign in with Apple for iOS.
 * Uses expo-apple-authentication + Supabase signInWithIdToken (no OAuth redirect).
 * Requires Expo Dev Build / TestFlight — does NOT work in Expo Go.
 */

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export type SignInWithAppleResult =
  | { success: true }
  | { success: false; error: Error };

/**
 * Check if native Apple Sign-In is available on this device.
 * Returns false on Android, web, simulator without Apple ID, or Expo Go.
 */
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Perform native Apple Sign-In and exchange token with Supabase.
 * No browser, no redirect — pure native flow.
 */
export async function signInWithAppleNative(): Promise<SignInWithAppleResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: new Error('Apple Sign-In is only available on iOS') };
  }
  if (!supabase) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken } = credential;
    if (!identityToken) {
      return {
        success: false,
        error: new Error('Apple did not return an identity token. Please try again.'),
      };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    });

    if (error) {
      return { success: false, error };
    }

    if (credential.fullName && data?.user) {
      const { givenName, familyName } = credential.fullName;
      const fullName = [givenName, familyName].filter(Boolean).join(' ').trim();
      if (fullName) {
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      }
    }

    return { success: true };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const code = String(err?.code ?? '').toLowerCase();
    const msg = err?.message ?? '';

    if (code === 'err_request_canceled' || msg.toLowerCase().includes('cancel')) {
      return { success: false, error: new Error('Sign in was cancelled') };
    }
    if (code === 'err_request_not_handled' || msg.toLowerCase().includes('not available')) {
      return {
        success: false,
        error: new Error(
          'Sign in with Apple is only available in an app build on a real iPhone—not in Expo Go or some simulators. Build with EAS Build or run "npx expo run:ios" on a device.'
        ),
      };
    }

    return {
      success: false,
      error: e instanceof Error ? e : new Error(msg || 'Apple Sign-In failed'),
    };
  }
}
