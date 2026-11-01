/** export-data – Datenexport (DSGVO Art. 20) als JSON. */
import { json, serve } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();
  const { data: dogs } = await admin.from('dogs').select('*').eq('owner_id', user.id);
  const dogIds = (dogs ?? []).map((d) => d.id as string);
  const byDogs = async (table: string) =>
    dogIds.length ? (await admin.from(table).select('*').in('dog_id', dogIds)).data ?? [] : [];
  const plans = await byDogs('training_plans');
  const planIds = plans.map((p) => p.id as string);
  const byPlans = async (table: string) =>
    planIds.length ? (await admin.from(table).select('*').in('plan_id', planIds)).data ?? [] : [];
  const media = (await admin.from('media_uploads').select('*').eq('owner_id', user.id)).data ?? [];
  const mediaIds = media.map((m) => m.id as string);

  return json({
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null, created_at: user.created_at },
    profile: (await admin.from('profiles').select('*').eq('id', user.id).single()).data,
    dogs,
    temperament_answers: await byDogs('temperament_answers'),
    temperament_profile: await byDogs('temperament_profile'),
    coach_tips: await byDogs('coach_tips'),
    media_uploads: media,
    analyses: mediaIds.length ? (await admin.from('analyses').select('*').in('media_id', mediaIds)).data : [],
    training_plans: plans,
    plan_tasks: await byPlans('plan_tasks'),
    plan_checkins: await byPlans('plan_checkins'),
    forum_posts: (await admin.from('forum_posts').select('*').eq('author_id', user.id)).data,
    forum_replies: (await admin.from('forum_replies').select('*').eq('author_id', user.id)).data,
    reports: (await admin.from('reports').select('*').eq('reporter_id', user.id)).data,
    blocks: (await admin.from('blocks').select('*').eq('blocker_id', user.id)).data,
  });
});
