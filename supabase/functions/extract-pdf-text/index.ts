// Supabase Edge Function (Deno runtime). Declare Deno for IDE type-checking.
declare const Deno: { serve: (handler: (req: Request) => Promise<Response> | Response) => void };

// Supabase Edge Function: extract text from a PDF sent as base64 in the request body.
// POST body: { "base64": "<base64-encoded-pdf>" }
// Response: { "text": "extracted text" } or { "error": "message" }

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - ESM URL import; resolved at runtime in Supabase Deno
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: corsHeaders, status: 405 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body. Send { base64: \"<base64-encoded-pdf>\" }" }),
        { headers: corsHeaders, status: 400 }
      );
    }
    const base64 = body != null && typeof body === "object" && "base64" in body
      ? (body as { base64: unknown }).base64
      : undefined;
    if (typeof base64 !== "string" || base64.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid body: { base64: string }" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const data = base64ToUint8Array(base64);
    const doc = await getDocument({
      data,
      useSystemFonts: true,
    }).promise;

    const numPages = doc.numPages;
    const parts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str?: string }) => ("str" in item ? item.str : ""))
        .join(" ");
      parts.push(pageText);
    }

    const text = parts.join("\n").replace(/\s+/g, " ").trim();

    return new Response(JSON.stringify({ text }), {
      headers: corsHeaders,
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `PDF extraction failed: ${message}` }),
      { headers: corsHeaders, status: 422 }
    );
  }
});
