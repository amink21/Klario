/**
 * Centralized AI client for Klario via OpenRouter.
 * - API key from EXPO_PUBLIC_OPENROUTER_API_KEY (dev only). Do NOT hardcode.
 * - OpenRouter: https://openrouter.ai/docs/quickstart (unified API, same as OpenAI format).
 * - Override with EXPO_PUBLIC_OPENROUTER_BASE_URL for a backend proxy.
 * - All responses are parsed as strict JSON and validated with Zod by callers.
 */

/** OpenRouter model: DeepSeek R1 free */
const MODEL_NAME = 'deepseek/deepseek-r1-0528:free';

/** Base URL: OpenRouter by default; override for backend proxy */
function getBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_OPENROUTER_BASE_URL) {
    return process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL;
  }
  return 'https://openrouter.ai/api/v1';
}

/** API key: from env (OpenRouter key at https://openrouter.ai/keys) */
function getApiKey(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_OPENROUTER_API_KEY) {
    return process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  }
  return undefined;
}

export type AITask =
  | 'extract_life_item'
  | 'transaction_category'
  | 'daily_brief'
  | 'subscription_detection'
  | 'smart_input_parse'
  | 'subscription_waste';

export interface AIError extends Error {
  code: 'no_api_key' | 'network' | 'timeout' | 'rate_limit' | 'invalid_json' | 'openai_error';
  status?: number;
}

const TIMEOUT_MS = 15000;
const RATE_LIMIT_RETRY_DELAY_MS = 2500;

/**
 * Call OpenAI (or future proxy), force JSON response, return parsed object.
 * Caller must validate with Zod. Retries once after a short delay on 429 (rate limit).
 */
export async function callAI<T = unknown>(
  task: AITask,
  payload: unknown
): Promise<T> {
  const key = getApiKey();
  if (!key) {
    const err = new Error('OpenRouter API key not configured (EXPO_PUBLIC_OPENROUTER_API_KEY)') as AIError;
    err.code = 'no_api_key';
    throw err;
  }

  const { system, user } = getPromptForTask(task, payload);
  const body = {
    model: MODEL_NAME,
    messages: [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: user },
    ],
    response_format: { type: 'json_object' as const },
    max_tokens: 500,
  };

  const doRequest = async (): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const baseUrl = getBaseUrl().replace(/\/$/, '');
      const url = `${baseUrl}/chat/completions`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        const e = new Error('Rate limit exceeded') as AIError;
        e.code = 'rate_limit';
        e.status = 429;
        throw e;
      }

      if (!res.ok) {
        const text = await res.text();
        let message = text || `API error ${res.status}`;
        try {
          const json = JSON.parse(text) as { error?: { message?: string }; message?: string };
          message = json?.error?.message ?? json?.message ?? message;
        } catch {
          /* use raw text */
        }
        if (res.status === 402) {
          message = 'Insufficient credits on OpenRouter. Add credits or check your key at openrouter.ai/settings. Free models may still require a verified account.';
        } else if (res.status === 401 || /user not found|invalid.*key|unauthorized/i.test(message)) {
          message =
            'OpenRouter authentication failed. Use an API key from https://openrouter.ai/keys (not an OpenAI key). ' +
            'Set EXPO_PUBLIC_OPENROUTER_API_KEY in your .env file, then restart the app (npm start).';
        }
        const e = new Error(message) as AIError;
        e.code = 'openai_error';
        e.status = res.status;
        throw e;
      }

      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data?.choices?.[0]?.message?.content?.trim();
      if (!raw) {
        const e = new Error('Empty AI response') as AIError;
        e.code = 'invalid_json';
        throw e;
      }

      return JSON.parse(raw) as T;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    return await doRequest();
  } catch (err) {
    const rateLimit = err instanceof Error && (err as AIError).code === 'rate_limit';
    if (rateLimit) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_RETRY_DELAY_MS));
      return await doRequest();
    }
    if (err instanceof SyntaxError) {
      const e = new Error('Invalid JSON from AI') as AIError;
      e.code = 'invalid_json';
      e.cause = err;
      throw e;
    }
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        const e = new Error('Request timeout') as AIError;
        e.code = 'timeout';
        throw e;
      }
      const e = err as AIError;
      if (e.code) throw e;
      e.code = 'network';
      throw e;
    }
    throw err;
  }
}

function getPromptForTask(
  task: AITask,
  payload: unknown
): { system: string; user: string } {
  switch (task) {
    case 'extract_life_item':
      return extractLifeItemPrompt(typeof payload === 'string' ? payload : String(payload));
    case 'transaction_category':
      return transactionCategoryPrompt(payload as { title: string; merchant?: string; amountCents: number });
    case 'daily_brief':
      return dailyBriefPrompt(payload as Parameters<typeof dailyBriefPrompt>[0]);
    case 'subscription_detection':
      return subscriptionDetectionPrompt(payload as Parameters<typeof subscriptionDetectionPrompt>[0]);
    case 'smart_input_parse': {
      const p = typeof payload === 'string' ? { text: payload, nowISO: undefined as string | undefined } : (payload as { text: string; nowISO?: string });
      return smartInputParsePrompt(p.text, p.nowISO);
    }
    case 'subscription_waste':
      return subscriptionWastePrompt(payload as Parameters<typeof subscriptionWastePrompt>[0]);
    default:
      throw new Error(`Unknown AI task: ${task}`);
  }
}

import {
  extractLifeItemPrompt,
  transactionCategoryPrompt,
  dailyBriefPrompt,
  subscriptionDetectionPrompt,
  smartInputParsePrompt,
  subscriptionWastePrompt,
} from './prompts';
