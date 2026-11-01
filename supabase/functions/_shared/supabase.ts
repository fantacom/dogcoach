import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import { requireEnv } from './env.ts';
import { HttpError } from './http.ts';

export type Admin = SupabaseClient;

let admin: Admin | null = null;
/** Service-Role-Client (umgeht RLS) – nur serverseitig. */
export function adminClient(): Admin {
  admin ??= createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export async function requireUser(req: Request): Promise<User> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'unauthorized');
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'unauthorized');
  return data.user;
}

/** Zeitgesteuerte Aufrufe (pg_cron) authentifizieren sich mit x-cron-secret. */
export function requireCron(req: Request): void {
  const got = req.headers.get('x-cron-secret') ?? '';
  const want = requireEnv('CRON_SECRET');
  const a = new TextEncoder().encode(got);
  const b = new TextEncoder().encode(want);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) throw new HttpError(401, 'unauthorized');
}

export async function configInt(key: string): Promise<number | null> {
  const { data } = await adminClient().from('app_config').select('value').eq('key', key).maybeSingle();
  return typeof data?.value === 'number' ? data.value : null;
}

export async function configString(key: string): Promise<string | null> {
  const { data } = await adminClient().from('app_config').select('value').eq('key', key).maybeSingle();
  return typeof data?.value === 'string' ? data.value : null;
}

export async function isPremium(userId: string): Promise<boolean> {
  const { data } = await adminClient().rpc('is_premium', { p_user: userId });
  return data === true;
}
