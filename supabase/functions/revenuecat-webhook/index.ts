/**
 * revenuecat-webhook – spiegelt den Abo-Status in profiles (Phase 7).
 * Auth: Header Authorization = REVENUECAT_WEBHOOK_SECRET (in RevenueCat als Webhook-Auth hinterlegen).
 * app_user_id = Supabase-User-ID (RevenueCat.logIn(userId) in der App).
 */
import { requireEnv } from '../_shared/env.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { RevenueCatEventSchema } from '../_shared/logic/schemas.ts';
import { adminClient, configString } from '../_shared/supabase.ts';

const ACTIVE = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'TEMPORARY_ENTITLEMENT_GRANT']);
const INACTIVE = new Set(['EXPIRATION']);

serve(async (req) => {
  if (req.headers.get('Authorization') !== requireEnv('REVENUECAT_WEBHOOK_SECRET')) throw new HttpError(401, 'unauthorized');
  const parsed = RevenueCatEventSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'invalid_input');
  const e = parsed.data.event;
  const entitlement = await configString('premium_entitlement_id');
  if (entitlement && e.entitlement_ids && !e.entitlement_ids.includes(entitlement)) return json({ ignored: true });
  if (!/^[0-9a-f-]{36}$/i.test(e.app_user_id)) return json({ ignored: true });

  const until = e.expiration_at_ms ? new Date(e.expiration_at_ms).toISOString() : null;
  if (ACTIVE.has(e.type)) {
    await adminClient().from('profiles').update({ is_premium: true, premium_until: until }).eq('id', e.app_user_id);
  } else if (INACTIVE.has(e.type)) {
    await adminClient().from('profiles').update({ is_premium: false, premium_until: until }).eq('id', e.app_user_id);
  }
  // CANCELLATION: Abo läuft bis expiration weiter → nur premium_until aktualisieren
  else if (e.type === 'CANCELLATION' && until) {
    await adminClient().from('profiles').update({ premium_until: until }).eq('id', e.app_user_id);
  }
  return json({ ok: true });
});
