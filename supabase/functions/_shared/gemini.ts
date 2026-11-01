import type { z } from 'zod';

import { requireEnv } from './env.ts';

/**
 * Gemini über Vertex AI in der EU (CLAUDE.md §2/§8: europe-west3).
 * Auth: Service-Account-JSON (GCP_SERVICE_ACCOUNT_JSON, roh oder base64) → OAuth-Token per signiertem JWT.
 */
type ServiceAccount = { client_email: string; private_key: string; project_id?: string };
let token: { value: string; exp: number } | null = null;

function serviceAccount(): ServiceAccount {
  const raw = requireEnv('GCP_SERVICE_ACCOUNT_JSON').trim();
  return JSON.parse(raw.startsWith('{') ? raw : atob(raw));
}

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (token && token.exp - 60 > now) return token.value;
  const sa = serviceAccount();
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`GCP-Token: ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: body.access_token, exp: now + body.expires_in };
  return token.value;
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

/** Strukturierte Beobachtungen aus Bild/Video. Zod-Validierung + 1 Retry. */
export async function geminiJson<S extends z.ZodType>(
  schema: S,
  prompt: string,
  media: { mimeType: string; base64: string },
): Promise<{ data: z.infer<S>; model: string }> {
  const location = Deno.env.get('GCP_LOCATION') || 'europe-west3';
  const project = Deno.env.get('GCP_PROJECT_ID') || serviceAccount().project_id;
  const model = requireEnv('GEMINI_MODEL');
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ inlineData: { mimeType: media.mimeType, data: media.base64 } }, { text: prompt }] },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      });
      if (!res.ok) throw new Error(`Vertex ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const body = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      const parsed = schema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new Error(`schema: ${parsed.error.message.slice(0, 300)}`);
      return { data: parsed.data, model };
    } catch (e) {
      lastError = e instanceof Error ? e.message : e;
      console.warn(`geminiJson Versuch ${attempt + 1} fehlgeschlagen:`, lastError);
    }
  }
  throw new Error(`Gemini-Antwort ungültig: ${String(lastError)}`);
}
