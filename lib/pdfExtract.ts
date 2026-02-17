/**
 * PDF text extraction via Python backend only.
 * Set EXPO_PUBLIC_PDF_EXTRACT_URL to your Python service (e.g. http://localhost:5000 or deployed URL).
 * Expects POST /extract with body { "base64": "<base64-pdf>" } -> { "text": "..." }.
 */

const PDF_EXTRACT_URL = process.env.EXPO_PUBLIC_PDF_EXTRACT_URL?.replace(/\/$/, "");

export function isPdfExtractAvailable(): boolean {
  return !!PDF_EXTRACT_URL;
}

/**
 * Send base64-encoded PDF to the Python backend and return extracted text.
 * @throws Error if PDF_EXTRACT_URL is not set or the request fails.
 */
export async function extractPdfTextFromApi(base64: string): Promise<string> {
  if (base64 == null || typeof base64 !== "string" || base64.length === 0) {
    throw new Error("PDF file could not be read (base64 missing or empty). Try again or use CSV/paste.");
  }
  if (!PDF_EXTRACT_URL) {
    throw new Error("PDF import requires EXPO_PUBLIC_PDF_EXTRACT_URL in .env (your Python extract service).");
  }

  const url = `${PDF_EXTRACT_URL}/extract`;
  const payload = { base64: base64 };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data: { text?: string; error?: string };
  try {
    data = (await res.json()) as { text?: string; error?: string };
  } catch {
    throw new Error(`Server returned invalid JSON (${res.status}). Is the PDF extract service running at ${PDF_EXTRACT_URL}?`);
  }
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }
  if (typeof data.text !== "string") {
    throw new Error("Invalid response: missing text");
  }
  return data.text;
}
