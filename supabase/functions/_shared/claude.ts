import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';

import { requireEnv } from './env.ts';

let client: Anthropic | null = null;

/**
 * Claude mit Structured Output (Zod). Validierung + genau 1 Retry (CLAUDE.md §7).
 * `check` kann zusätzliche Regeln prüfen (z. B. aversive Methoden) – Rückgabe = Fehlertext.
 * Modell kommt aus CLAUDE_MODEL (nie im Code).
 */
export async function claudeJson<S extends z.ZodType>(
  schema: S,
  prompt: string,
  opts: { maxTokens?: number; check?: (data: z.infer<S>) => string | null } = {},
): Promise<{ data: z.infer<S>; model: string }> {
  client ??= new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  const model = requireEnv('CLAUDE_MODEL');
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.messages.parse({
        model,
        max_tokens: opts.maxTokens ?? 12000,
        output_config: { effort: 'medium', format: zodOutputFormat(schema) },
        messages: [
          {
            role: 'user',
            content:
              attempt === 0
                ? prompt
                : `${prompt}\n\nACHTUNG: Die vorige Antwort war ungültig (${String(lastError)}). Halte alle Regeln und das Schema exakt ein.`,
          },
        ],
      });
      if (res.stop_reason === 'refusal') throw new Error('refusal');
      const parsed = schema.safeParse(res.parsed_output);
      if (!parsed.success) throw new Error(`schema: ${parsed.error.message.slice(0, 300)}`);
      const problem = opts.check?.(parsed.data);
      if (problem) throw new Error(problem);
      return { data: parsed.data, model: res.model };
    } catch (e) {
      lastError = e instanceof Error ? e.message : e;
      console.warn(`claudeJson Versuch ${attempt + 1} fehlgeschlagen:`, lastError);
    }
  }
  throw new Error(`Claude-Antwort ungültig: ${String(lastError)}`);
}
