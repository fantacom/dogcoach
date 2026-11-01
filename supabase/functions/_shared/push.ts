import { localDate, zonedToUtc } from './logic/time.ts';
import { optionalEnv } from './env.ts';
import { adminClient, configInt } from './supabase.ts';

export type PushKind = 'task' | 'checkin' | 'tip' | 'phase_change' | 'forum';

/** Wie viele Pushes darf der Nutzer heute (lokaler Tag) noch bekommen? max_daily_pushes aus app_config. */
export async function remainingPushesToday(userId: string, timezone: string): Promise<number> {
  const max = (await configInt('max_daily_pushes')) ?? 1;
  const dayStart = zonedToUtc(localDate(new Date(), timezone), '00:00', timezone).toISOString();
  const { count } = await adminClient()
    .from('push_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('sent_at', dayStart);
  return Math.max(0, max - (count ?? 0));
}

/** Versand über den Expo-Push-Dienst. Gibt true zurück, wenn angenommen. */
export async function sendPush(input: {
  userId: string;
  token: string;
  kind: PushKind;
  refId?: string;
  title: string;
  body: string;
  url: string; // Deep Link in die App, z. B. "/plan/<id>"
}): Promise<boolean> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const accessToken = optionalEnv('EXPO_ACCESS_TOKEN');
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ to: input.token, title: input.title, body: input.body, data: { url: input.url }, sound: 'default' }),
  });
  if (!res.ok) {
    console.warn('Expo-Push fehlgeschlagen', res.status);
    return false;
  }
  const body = (await res.json()) as { data?: { status?: string; details?: { error?: string } } };
  if (body.data?.details?.error === 'DeviceNotRegistered') {
    await adminClient().from('profiles').update({ push_token: null }).eq('id', input.userId);
  }
  if (body.data?.status !== 'ok') return false;
  await adminClient().from('push_log').insert({ user_id: input.userId, kind: input.kind, ref_id: input.refId ?? null });
  return true;
}
