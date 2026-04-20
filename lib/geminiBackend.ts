/**
 * All Gemini API usage goes through the Render backend. The app never reads or
 * sends a Gemini/Google API key. Set GEMINI_API_KEY or GOOGLE_API_KEY only in
 * Render environment variables (Dashboard → Environment). The backend uses
 * that key for:
 * - POST /ai/daily-brief (morning brief)
 * - POST /imports/statement/parse-gemini (PDF statement import)
 *
 * In the app, set EXPO_PUBLIC_IMPORT_API_URL to your backend URL
 * (e.g. https://klovio.onrender.com). Do not set EXPO_PUBLIC_GOOGLE_API_KEY or
 * GEMINI_API_KEY in the app .env.
 */

const _base = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_IMPORT_API_URL?.replace(/\/$/, '') : undefined;
const _key = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_IMPORT_API_KEY ?? '' : '';

/** Base URL of the Render backend (no trailing slash). Undefined if not set. */
export const GEMINI_BACKEND_URL: string | undefined = _base;

/** Optional import key sent as X-KLOVIO-IMPORT-KEY when backend has IMPORT_API_KEY set. */
export const GEMINI_BACKEND_IMPORT_KEY: string = _key;

/** True if the app can call Gemini-backed features (brief, PDF import). */
export function isGeminiBackendAvailable(): boolean {
  return !!GEMINI_BACKEND_URL;
}

/** Message to show when backend is not configured. */
export const GEMINI_BACKEND_REQUIRED_MESSAGE =
  'Set EXPO_PUBLIC_IMPORT_API_URL in .env to your Render URL (e.g. https://klovio.onrender.com). Add GEMINI_API_KEY or GOOGLE_API_KEY in Render environment variables.';
