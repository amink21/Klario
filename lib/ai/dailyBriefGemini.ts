/**
 * Morning brief via Render backend. Gemini key is read from backend env only.
 * @see lib/geminiBackend.ts for policy: all Gemini usage goes through the backend.
 */

import {
  GEMINI_BACKEND_URL,
  GEMINI_BACKEND_IMPORT_KEY,
  GEMINI_BACKEND_REQUIRED_MESSAGE,
} from '@/lib/geminiBackend';
import { dailyBriefSchema, type DailyBriefResult } from './schemas';
import type { DailyBriefInput } from './dailyBrief';

const TIMEOUT_MS = 20000;

/**
 * Generate the morning brief by calling the Render backend. The API key is read from
 * the backend environment (GEMINI_API_KEY or GOOGLE_API_KEY on Render), not from the app.
 */
export async function generateDailyBriefWithGemini(
  input: DailyBriefInput
): Promise<DailyBriefResult> {
  if (!GEMINI_BACKEND_URL) {
    throw new Error(GEMINI_BACKEND_REQUIRED_MESSAGE);
  }

  const url = `${GEMINI_BACKEND_URL}/ai/daily-brief`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (GEMINI_BACKEND_IMPORT_KEY) {
    headers['X-KLOVIO-IMPORT-KEY'] = GEMINI_BACKEND_IMPORT_KEY;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      let message = text || `Backend error ${res.status}`;
      try {
        const json = JSON.parse(text) as { detail?: string };
        message = json?.detail ?? message;
      } catch {
        /* use raw text */
      }
      if (res.status === 404) {
        message =
          'Morning brief endpoint not found. Ensure your Render backend is up to date and includes the /ai/daily-brief route.';
      }
      if (res.status === 503) {
        message =
          'Backend could not reach Gemini. Set GEMINI_API_KEY or GOOGLE_API_KEY in Render environment variables (Dashboard → Environment).';
      }
      if (res.status === 429) {
        message = 'Rate limit exceeded. Wait a minute and try again.';
      }
      throw new Error(message);
    }

    const data = (await res.json()) as { lines?: string[] };
    const parsed = dailyBriefSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Invalid brief format: ${parsed.error.message}`);
    }
    return parsed.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw err;
  }
}
