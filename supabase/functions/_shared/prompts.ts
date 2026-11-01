import { z } from 'zod';

const cache = new Map<string, string>();

/** Lädt supabase/functions/_shared/prompts/<name>.md und ersetzt {{platzhalter}}. */
export async function renderPrompt(
  name: string,
  vars: Record<string, unknown>,
  schema: z.ZodType,
): Promise<string> {
  let tpl = cache.get(name);
  if (!tpl) {
    tpl = await Deno.readTextFile(new URL(`./prompts/${name}.md`, import.meta.url));
    cache.set(name, tpl);
  }
  const all: Record<string, unknown> = { ...vars, schema: JSON.stringify(z.toJSONSchema(schema)) };
  return tpl
    .replace(/<!--[\s\S]*?-->\s*/, '')
    .replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
      const v = all[k];
      if (v === null || v === undefined || v === '') return '–';
      return typeof v === 'string' ? v : JSON.stringify(v, null, 1);
    });
}

export const PROMPT_VERSION = 1;
