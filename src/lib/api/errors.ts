/** Einheitliche Fehler für die UI. LIMIT_REACHED kommt aus den DB-Triggern (Freemium). */
export class LimitReachedError extends Error {
  constructor(public limit: string) {
    super(`LIMIT_REACHED:${limit}`);
  }
}

export function toAppError(e: unknown): Error {
  const message =
    e && typeof e === 'object' && 'message' in e
      ? String((e as { message: unknown }).message)
      : String(e);
  const m = message.match(/LIMIT_REACHED:(\w+)/);
  if (m?.[1]) return new LimitReachedError(m[1]);
  return e instanceof Error ? e : new Error(message);
}

/** Supabase-Antwort auspacken: wirft bei Fehler, liefert data. */
export function unwrap<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw toAppError(res.error);
  return res.data;
}
