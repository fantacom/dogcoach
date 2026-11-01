/**
 * generate-coach-tips (CLAUDE.md §3.3) – täglich per pg_cron.
 * Pro Hund: Phasenwechsel-Hinweis (ohne KI, aus kuratierten Phasen) + 1–3 KI-Tipps ohne Themen-Dopplung (14 Tage).
 */
import { claudeJson } from '../_shared/claude.ts';
import { loadDogContext } from '../_shared/dogContext.ts';
import { json, serve } from '../_shared/http.ts';
import { retrieveKnowledge } from '../_shared/knowledge.ts';
import { anyAversive, replaceDiagnosisTerm } from '../_shared/logic/safety.ts';
import { CoachTipsSchema, sanitizeTips } from '../_shared/logic/schemas.ts';
import { inferTags } from '../_shared/logic/tags.ts';
import { renderPrompt } from '../_shared/prompts.ts';
import { adminClient, requireCron } from '../_shared/supabase.ts';

const BATCH = 100;

serve(async (req) => {
  requireCron(req);
  const admin = adminClient();
  const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
  // Hunde ohne Tipp in den letzten 20 Stunden
  const { data: dogs, error } = await admin.rpc('dogs_due_for_tips', { p_since: since, p_limit: BATCH });
  if (error) throw error;
  let created = 0;
  for (const { id } of (dogs ?? []) as { id: string }[]) {
    try {
      created += await tipsForDog(id);
    } catch (e) {
      console.error('coach-tips', id, e);
    }
  }
  return json({ dogs: dogs?.length ?? 0, created });
});

async function tipsForDog(dogId: string): Promise<number> {
  const admin = adminClient();
  const ctx = await loadDogContext(dogId);
  let count = 0;

  // Phasenwechsel: eigener Hinweis, einmal pro Phase
  if (ctx.phase) {
    const key = `phase_${ctx.phase.current.phase_key}`;
    const { count: existing } = await admin.from('coach_tips').select('id', { count: 'exact', head: true })
      .eq('dog_id', dogId).eq('topic_key', key);
    if (!existing) {
      const c = ctx.phase.current.content;
      await admin.from('coach_tips').insert({
        dog_id: dogId, category: 'phase_change', topic_key: key, source: 'phase_change', priority: 2,
        title: `${ctx.dog.name} ist jetzt in der Phase „${c.label}“`,
        body: `Typisch jetzt: ${c.typical.slice(0, 2).join(', ')}. Wichtig: ${c.focus.slice(0, 2).join(', ')}.`,
      });
      count++;
    }
  }

  const { data: recent } = await admin.from('coach_tips').select('topic_key')
    .eq('dog_id', dogId).gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString());
  const { data: plans } = await admin.from('training_plans').select('goal, start_date, end_date')
    .eq('dog_id', dogId).eq('status', 'active');
  const recentTopics = [...new Set((recent ?? []).map((r) => r.topic_key as string))];
  const knowledge = await retrieveKnowledge(
    inferTags({ text: (plans ?? []).map((p) => p.goal).join(' '), phaseKey: ctx.phase?.current.phase_key }).concat(['exercise', 'health_reminder']),
    3,
  );
  const prompt = await renderPrompt('coach_tips', {
    dog_profile: ctx.profileText,
    phase: ctx.phase ? { aktuell: ctx.phase.current.content, naechste: ctx.phase.next?.content.label, ab: ctx.phase.nextStartDate } : null,
    plans: plans?.length ? plans : 'keine',
    recent_topics: recentTopics.length ? recentTopics.join(', ') : 'keine',
    knowledge,
  }, CoachTipsSchema);
  const { data } = await claudeJson(CoachTipsSchema, prompt, {
    maxTokens: 4000,
    check: (t) => (anyAversive(t.tips.map((x) => x.body)) ? 'aversive Methoden' : null),
  });
  const tips = sanitizeTips(data).tips.filter((t) => !recentTopics.includes(t.topic_key));
  if (tips.length) {
    await admin.from('coach_tips').insert(tips.map((t) => ({
      dog_id: dogId, category: t.category, topic_key: t.topic_key, source: 'ai', priority: t.priority,
      title: replaceDiagnosisTerm(t.title), body: replaceDiagnosisTerm(t.body),
    })));
  }
  return count + tips.length;
}
