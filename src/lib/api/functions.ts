import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../supabase';
import { toAppError } from './errors';

export class FunctionError extends Error {
  constructor(public status: number, public code: string, public body: Record<string, unknown>) {
    super(code);
  }
}

/** Edge Function aufrufen; Fehlerkörper ({ error } / { reason }) wird ausgelesen. */
export async function invoke<T>(name: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      let payload: Record<string, unknown> = {};
      try {
        payload = (await res.json()) as Record<string, unknown>;
      } catch {
        /* leer */
      }
      throw new FunctionError(res.status, String(payload.reason ?? payload.error ?? 'error'), payload);
    }
    throw toAppError(error);
  }
  return data as T;
}
