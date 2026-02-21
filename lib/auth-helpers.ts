import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession?.();

/**
 * Redirect URL for Supabase OAuth. Uses app scheme (klario://auth) so the
 * provider redirects back into the app. Add klario://auth to Supabase Redirect URLs.
 */
export function getRedirectUri(): string {
  return Linking.createURL('auth');
}

/**
 * Parse tokens from OAuth/magic-link redirect URL (query or hash) and set Supabase session.
 */
export async function createSessionFromUrl(url: string): Promise<void> {
  if (!supabase) return;
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const paramsStr = hash || query;
  if (!paramsStr) return;

  const params = new URLSearchParams(paramsStr);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token) return;

  await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });
}

/**
 * Run OAuth flow: open provider URL, catch redirect, create session.
 * Apple is native-only (signInWithIdToken) — do not use OAuth for Apple.
 */
export async function signInWithOAuthProvider(
  provider: 'google'
): Promise<{ error?: Error }> {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const redirectTo = getRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error };
  if (!data?.url) return { error: new Error('No OAuth URL') };

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success' || !res.url) {
    return { error: new Error('OAuth was cancelled or failed') };
  }

  try {
    await createSessionFromUrl(res.url);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e : new Error('Failed to create session') };
  }
}
