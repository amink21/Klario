/**
 * PDF statement import via Render backend. Gemini key is read from backend env only.
 * @see lib/geminiBackend.ts for policy: all Gemini usage goes through the backend.
 */

import {
  GEMINI_BACKEND_URL,
  GEMINI_BACKEND_IMPORT_KEY,
  GEMINI_BACKEND_REQUIRED_MESSAGE,
  isGeminiBackendAvailable,
} from '@/lib/geminiBackend';

export interface GeminiTransaction {
  dateISO: string;
  title: string;
  amountCents: number;
  direction: 'debit' | 'credit';
  category: string;
  merchant: string | null;
  source: string;
  confidence: number;
}

export interface GeminiParseResponse {
  transactions: GeminiTransaction[];
  warnings: string[];
  stats: { pages: number | null; model: string };
}

export { isGeminiBackendAvailable as isGeminiImportAvailable };

/**
 * Upload PDF file to backend parse-gemini endpoint; returns parsed transactions.
 * Uses multipart/form-data. No PDF storage on device or server (one-and-done).
 */
export async function parsePdfWithGemini(uri: string, fileName?: string): Promise<GeminiParseResponse> {
  if (!GEMINI_BACKEND_URL) {
    throw new Error(GEMINI_BACKEND_REQUIRED_MESSAGE);
  }

  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName ?? 'statement.pdf',
    type: 'application/pdf',
  } as unknown as Blob);
  formData.append('timezone', 'America/Montreal');

  const headers: Record<string, string> = {};
  if (GEMINI_BACKEND_IMPORT_KEY) headers['X-KLARIO-IMPORT-KEY'] = GEMINI_BACKEND_IMPORT_KEY;

  const res = await fetch(`${GEMINI_BACKEND_URL}/imports/statement/parse-gemini`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(detail?.detail ?? `Request failed: ${res.status}`);
  }

  const data = (await res.json()) as GeminiParseResponse;
  if (!data || !Array.isArray(data.transactions)) {
    throw new Error('Invalid response: missing transactions');
  }
  return data;
}
