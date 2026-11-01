/**
 * forum-post – Fragen und Antworten anlegen, mit automatischem Vorfilter (CLAUDE.md §3.5, App Store 1.2).
 * Direktes Einfügen ist per RLS gesperrt; nur dieser Weg veröffentlicht.
 */
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { filterContent } from '../_shared/logic/forumFilter.ts';
import { ForumPostInputSchema } from '../_shared/logic/schemas.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { loadDogContext } from '../_shared/dogContext.ts';

const MAX_PER_HOUR = 10;

serve(async (req) => {
  const user = await requireUser(req);
  const parsed = ForumPostInputSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'invalid_input');
  const input = parsed.data;
  const admin = adminClient();

  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const [{ count: posts }, { count: replies }] = await Promise.all([
    admin.from('forum_posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id).gte('created_at', hourAgo),
    admin.from('forum_replies').select('id', { count: 'exact', head: true }).eq('author_id', user.id).gte('created_at', hourAgo),
  ]);
  if ((posts ?? 0) + (replies ?? 0) >= MAX_PER_HOUR) throw new HttpError(429, 'rate_limited');

  const verdict = input.kind === 'post' ? filterContent(input.title, input.body) : filterContent(input.body);
  if (!verdict.ok) return json({ ok: false, reason: verdict.reason }, 422);

  if (input.kind === 'post') {
    let dogSnapshot = null;
    if (input.dog_id) {
      const { data: dog } = await admin.from('dogs').select('owner_id').eq('id', input.dog_id).single();
      if (dog?.owner_id !== user.id) throw new HttpError(403, 'forbidden');
      const ctx = await loadDogContext(input.dog_id);
      const lines = ctx.profileText.split('\n');
      dogSnapshot = {
        breed: lines.find((l) => l.startsWith('Rasse:'))?.slice(7) ?? null,
        age_weeks: ctx.phase?.ageWeeks ?? null,
        phase: ctx.phase?.current.content.label ?? null,
      };
    }
    if (input.image_path && !input.image_path.startsWith(`${user.id}/`)) throw new HttpError(403, 'forbidden');
    const { data, error } = await admin.from('forum_posts').insert({
      author_id: user.id, dog_id: input.dog_id ?? null, dog_snapshot: dogSnapshot, category: input.category,
      title: input.title, body: input.body, image_url: input.image_path ?? null,
    }).select('id').single();
    if (error) throw error;
    return json({ ok: true, id: data.id });
  }

  const { data: post } = await admin.from('forum_posts').select('id, author_id, status').eq('id', input.post_id).single();
  if (!post || post.status !== 'published') throw new HttpError(404, 'not_found');
  if (post.author_id) {
    const { count: blocked } = await admin.from('blocks').select('blocker_id', { count: 'exact', head: true })
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${post.author_id}),and(blocker_id.eq.${post.author_id},blocked_id.eq.${user.id})`);
    if (blocked) throw new HttpError(403, 'blocked');
  }
  const { data, error } = await admin.from('forum_replies').insert({ post_id: post.id, author_id: user.id, body: input.body })
    .select('id').single();
  if (error) throw error;
  return json({ ok: true, id: data.id });
});
