/**
 * forum-ai-reply – Antwortgarantie (CLAUDE.md §3.5), alle 15 Minuten per pg_cron.
 * Antworten sind als KI gekennzeichnet (is_ai = true → „Antwort vom KI-Coach“, EU AI Act).
 */
import { claudeJson } from '../_shared/claude.ts';
import { json, serve } from '../_shared/http.ts';
import { retrieveKnowledge } from '../_shared/knowledge.ts';
import { filterContent } from '../_shared/logic/forumFilter.ts';
import { AGGRESSION_NOTICE, anyAversive, replaceDiagnosisTerm, VET_NOTICE } from '../_shared/logic/safety.ts';
import { ForumReplySchema } from '../_shared/logic/schemas.ts';
import { inferTags } from '../_shared/logic/tags.ts';
import { renderPrompt } from '../_shared/prompts.ts';
import { adminClient, requireCron } from '../_shared/supabase.ts';

serve(async (req) => {
  requireCron(req);
  const admin = adminClient();
  const { data: posts, error } = await admin.rpc('posts_needing_ai_reply', { p_limit: 20 });
  if (error) throw error;
  let replied = 0;
  for (const post of (posts ?? []) as { id: string; category: string; title: string; body: string; dog_snapshot: unknown }[]) {
    try {
      const knowledge = await retrieveKnowledge(inferTags({ text: `${post.title} ${post.body}` }), 3);
      const prompt = await renderPrompt('forum_reply', {
        category: post.category, title: post.title, body: post.body, dog: post.dog_snapshot, knowledge,
      }, ForumReplySchema);
      const { data } = await claudeJson(ForumReplySchema, prompt, {
        maxTokens: 4000,
        check: (r) => (anyAversive([r.body_md]) ? 'aversive Methoden' : filterContent(r.body_md).ok ? null : 'Filter'),
      });
      const notice = data.safety_flag === 'vet' ? VET_NOTICE : data.safety_flag === 'aggression' ? AGGRESSION_NOTICE : null;
      const body = replaceDiagnosisTerm([notice, data.body_md].filter(Boolean).join('\n\n'));
      const { error: insErr } = await admin.from('forum_replies').insert({ post_id: post.id, author_id: null, is_ai: true, body });
      if (insErr) throw insErr;
      await admin.from('forum_posts').update({ ai_replied_at: new Date().toISOString() }).eq('id', post.id);
      replied++;
    } catch (e) {
      console.error('forum-ai-reply', post.id, e);
    }
  }
  return json({ replied });
});
