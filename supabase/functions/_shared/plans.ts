import { claudeJson } from './claude.ts';
import { loadDogContext } from './dogContext.ts';
import { retrieveKnowledge } from './knowledge.ts';
import { anyAversive, replaceDiagnosisTerm } from './logic/safety.ts';
import { sanitizePlan, TrainingPlanSchema } from './logic/schemas.ts';
import { inferTags } from './logic/tags.ts';
import { addDays, localDate, zonedToUtc } from './logic/time.ts';
import { renderPrompt } from './prompts.ts';
import { adminClient } from './supabase.ts';

export type CreatePlanResult =
  | { ok: true; planId: string }
  | { ok: false; reason: 'limit_reached' | 'error'; message?: string };

/**
 * Erzeugt Plan + plan_tasks + plan_checkins (CLAUDE.md §3.4).
 * Bei previousPlanId: neue Version, alter Plan → superseded.
 */
export async function createTrainingPlan(input: {
  dogId: string;
  analysisId: string | null;
  goal: string;
  assessmentText: string;
  previousPlanId?: string | null;
  adjustment?: string | null;
}): Promise<CreatePlanResult> {
  const admin = adminClient();
  const ctx = await loadDogContext(input.dogId);
  const knowledge = await retrieveKnowledge(inferTags({ text: `${input.goal} ${input.assessmentText}`, phaseKey: ctx.phase?.current.phase_key }));
  const prompt = await renderPrompt(
    'training_plan',
    { goal: input.goal, assessment: input.assessmentText, dog_profile: ctx.profileText, adjustment: input.adjustment, knowledge },
    TrainingPlanSchema,
  );
  const { data } = await claudeJson(TrainingPlanSchema, prompt, {
    check: (p) =>
      p.tasks.length === 0
        ? 'Plan ohne Aufgaben'
        : anyAversive([p.summary, ...p.tasks.flatMap((t) => [t.title, t.goal, ...t.steps, t.typical_mistake])])
          ? 'Plan enthält aversive Methoden'
          : null,
  });
  const plan = sanitizePlan(data);

  let version = 1;
  if (input.previousPlanId) {
    const { data: prev } = await admin.from('training_plans').select('version').eq('id', input.previousPlanId).single();
    version = (prev?.version ?? 1) + 1;
    await admin.from('training_plans').update({ status: 'superseded' }).eq('id', input.previousPlanId);
  }

  const tz = ctx.ownerTimezone;
  const time = ctx.notificationTime.slice(0, 5);
  const start = localDate(new Date(), tz);
  const startDate = plan.tasks.length && zonedToUtc(start, time, tz) < new Date() ? addDays(start, 1) : start;
  const { data: created, error } = await admin
    .from('training_plans')
    .insert({
      dog_id: input.dogId,
      analysis_id: input.analysisId,
      previous_plan_id: input.previousPlanId ?? null,
      goal: replaceDiagnosisTerm(plan.goal),
      summary: replaceDiagnosisTerm(plan.summary),
      start_date: startDate,
      end_date: addDays(startDate, plan.duration_weeks * 7 - 1),
      version,
    })
    .select('id')
    .single();
  if (error || !created) {
    if (input.previousPlanId) await admin.from('training_plans').update({ status: 'active' }).eq('id', input.previousPlanId);
    if (error?.message?.includes('LIMIT_REACHED')) return { ok: false, reason: 'limit_reached' };
    return { ok: false, reason: 'error', message: error?.message };
  }

  const tasks = plan.tasks.map((t) => ({
    plan_id: created.id,
    day_index: t.day_index,
    scheduled_at: zonedToUtc(addDays(startDate, t.day_index), time, tz).toISOString(),
    title: t.title,
    success_criteria: t.success_criteria,
    steps: { exercise: t.exercise, goal: t.goal, steps: t.steps, duration_min: t.duration_min, typical_mistake: t.typical_mistake },
  }));
  const checkins = plan.checkins.map((c) => ({
    plan_id: created.id,
    due_at: zonedToUtc(addDays(startDate, c.day_index), time, tz).toISOString(),
    instruction: c.instruction,
  }));
  const r1 = await admin.from('plan_tasks').insert(tasks);
  const r2 = checkins.length ? await admin.from('plan_checkins').insert(checkins) : { error: null };
  if (r1.error || r2.error) {
    await admin.from('training_plans').delete().eq('id', created.id);
    return { ok: false, reason: 'error', message: (r1.error ?? r2.error)?.message };
  }
  return { ok: true, planId: created.id };
}
