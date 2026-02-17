/**
 * PDF statement import via FastAPI backend (Gemini). No Flask; no base64.
 * Set EXPO_PUBLIC_IMPORT_API_URL to your backend (e.g. http://localhost:8000).
 */

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

const IMPORT_API_URL = process.env.EXPO_PUBLIC_IMPORT_API_URL?.replace(/\/$/, '');
const IMPORT_API_KEY = process.env.EXPO_PUBLIC_IMPORT_API_KEY ?? '';

export function isGeminiImportAvailable(): boolean {
  return !!IMPORT_API_URL;
}

/**
 * Upload PDF file to backend parse-gemini endpoint; returns parsed transactions.
 * Uses multipart/form-data. No PDF storage on device or server (one-and-done).
 */
export async function parsePdfWithGemini(uri: string, fileName?: string): Promise<GeminiParseResponse> {
  if (!IMPORT_API_URL) {
    throw new Error('PDF import requires EXPO_PUBLIC_IMPORT_API_URL (backend with Gemini) in .env.');
  }

  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName ?? 'statement.pdf',
    type: 'application/pdf',
  } as unknown as Blob);
  formData.append('timezone', 'America/Montreal');

  const headers: Record<string, string> = {};
  if (IMPORT_API_KEY) headers['X-KLARIO-IMPORT-KEY'] = IMPORT_API_KEY;

  const res = await fetch(`${IMPORT_API_URL}/imports/statement/parse-gemini`, {
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
