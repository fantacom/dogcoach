/**
 * send-reminders – alle 15 Minuten per pg_cron (CLAUDE.md §3.3/§3.4).
 * Reihenfolge je Nutzer: fällige Trainingsaufgabe > Check-in > wichtigster Coach-Tipp (zur Wunsch-Uhrzeit).
 * max_daily_pushes gilt für alle Arten zusammen. Ohne Push-Token wird nur markiert (In-App-Feed zeigt alles).
 */
import { json, serve } from '../_shared/http.ts';
import { localMinutes } from '../_shared/logic/time.ts';
import { remainingPushesToday, sendPush } from '../_shared/push.ts';
import { adminClient, requireCron } from '../_shared/supabase.ts';

type Profile = { id: string; push_token: string | null; timezone: string; notification_time: string };

serve(async (req) => {
  requireCron(req);
  const admin = adminClient();
  const now = new Date().toISOString();
  let sent = 0;

  // Fällige Aufgaben aktiver Pläne
  const { data: tasks } = await admin.from('plan_tasks')
    .select('id, title, plan:training_plans!inner(id, status, dog:dogs!inner(name, owner:profiles!inner(id, push_token, timezone, notification_time)))')
    .is('notified_at', null).lte('scheduled_at', now).eq('plan.status', 'active').limit(500);
  for (const t of tasks ?? []) {
    const plan = t.plan as unknown as { id: string; dog: { name: string; owner: Profile } };
    const p = plan.dog.owner;
    if (p.push_token && (await remainingPushesToday(p.id, p.timezone)) > 0) {
      if (await sendPush({ userId: p.id, token: p.push_token, kind: 'task', refId: t.id,
        title: `Training mit ${plan.dog.name}`, body: t.title, url: `/plan/${plan.id}?task=${t.id}` })) sent++;
    }
    await admin.from('plan_tasks').update({ notified_at: now }).eq('id', t.id);
  }

  // Fällige Check-ins
  const { data: checkins } = await admin.from('plan_checkins')
    .select('id, instruction, plan:training_plans!inner(id, status, dog:dogs!inner(id, name, owner:profiles!inner(id, push_token, timezone, notification_time)))')
    .is('notified_at', null).is('media_id', null).lte('due_at', now).eq('plan.status', 'active').limit(500);
  for (const c of checkins ?? []) {
    const plan = c.plan as unknown as { id: string; dog: { id: string; name: string; owner: Profile } };
    const p = plan.dog.owner;
    if (p.push_token && (await remainingPushesToday(p.id, p.timezone)) > 0) {
      if (await sendPush({ userId: p.id, token: p.push_token, kind: 'checkin', refId: c.id,
        title: `Check-in für ${plan.dog.name}`, body: 'Nimm die gleiche Situation nochmal auf – so sehen wir den Fortschritt.',
        url: `/analysis/new?checkin=${c.id}&dog=${plan.dog.id}` })) sent++;
    }
    await admin.from('plan_checkins').update({ notified_at: now }).eq('id', c.id);
  }

  // Coach-Tipp zur Wunsch-Uhrzeit (±15 Min), höchstens einer pro Tag
  const { data: tips } = await admin.from('coach_tips')
    .select('id, title, body, dog:dogs!inner(id, name, owner:profiles!inner(id, push_token, timezone, notification_time))')
    .is('pushed_at', null).is('read_at', null).gte('created_at', new Date(Date.now() - 86400000).toISOString())
    .order('priority', { ascending: false }).limit(1000);
  const done = new Set<string>();
  for (const tip of tips ?? []) {
    const dog = tip.dog as unknown as { id: string; name: string; owner: Profile };
    const p = dog.owner;
    if (!p.push_token || done.has(p.id)) continue;
    const [h, m] = p.notification_time.split(':').map(Number);
    const diff = localMinutes(new Date(), p.timezone) - (h! * 60 + m!);
    if (diff < 0 || diff >= 15) continue;
    done.add(p.id);
    if ((await remainingPushesToday(p.id, p.timezone)) <= 0) continue;
    if (await sendPush({ userId: p.id, token: p.push_token, kind: 'tip', refId: tip.id, title: tip.title, body: tip.body, url: '/' })) {
      sent++;
      await admin.from('coach_tips').update({ pushed_at: now }).eq('id', tip.id);
    }
  }
  return json({ sent });
});
