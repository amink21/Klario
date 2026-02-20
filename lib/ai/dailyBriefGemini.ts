/**
 * Morning brief via Google Gemini (separate from OpenRouter).
 * Uses EXPO_PUBLIC_GOOGLE_API_KEY or GEMINI_API_KEY. Never hardcode.
 */

import { dailyBriefSchema, type DailyBriefResult } from './schemas';
import { dailyBriefPrompt } from './prompts';
import type { DailyBriefInput } from './dailyBrief';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TIMEOUT_MS = 15000;

function getGeminiKey(): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_API_KEY ??
      process.env.GEMINI_API_KEY
    );
  }
  return undefined;
}

/**
 * Generate the morning brief using Gemini. Call this instead of callAI('daily_brief', ...).
 */
export async function generateDailyBriefWithGemini(
  input: DailyBriefInput
): Promise<DailyBriefResult> {
  const key = getGeminiKey();
  if (!key) {
    throw new Error(
      'Gemini API key not configured. Set EXPO_PUBLIC_GOOGLE_API_KEY or GEMINI_API_KEY in .env for the morning brief.'
    );
  }

  const { system, user } = dailyBriefPrompt(input);
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${system}\n\n${user}` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 500,
      responseMimeType: 'application/json' as const,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      let message = text || `Gemini API error ${res.status}`;
      try {
        const json = JSON.parse(text) as { error?: { message?: string } };
        message = json?.error?.message ?? message;
      } catch {
        /* use raw text */
      }
      if (res.status === 429) {
        message = 'Gemini rate limit exceeded. Wait a minute and try again.';
      } else if (res.status === 401 || res.status === 403) {
        message =
          'Invalid Gemini API key. Get a key at https://aistudio.google.com/apikey and set EXPO_PUBLIC_GOOGLE_API_KEY in .env.';
      }
      throw new Error(message);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = dailyBriefSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(`Invalid brief format: ${parsed.error.message}`);
    }
    return parsed.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof SyntaxError) {
      throw new Error('Invalid JSON from Gemini');
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw err;
  }
}
