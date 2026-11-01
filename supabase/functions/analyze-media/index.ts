/**
 * analyze-media (CLAUDE.md §3.4): Gemini beobachtet → Sicherheitsregeln → Claude schätzt ein → ggf. Trainingsplan.
 * Check-in-Aufnahmen werden mit der Ausgangsaufnahme verglichen und der Plan versioniert angepasst.
 * Antwortet sofort (202); Fortschritt über Realtime auf media_uploads.status.
 */
import { claudeJson } from '../_shared/claude.ts';
import { loadDogContext } from '../_shared/dogContext.ts';
import { geminiJson, toBase64 } from '../_shared/gemini.ts';
import { HttpError, json, readJson, serve } from '../_shared/http.ts';
import { retrieveKnowledge } from '../_shared/knowledge.ts';
import {
  anyAversive,
  decideSafety,
  replaceDiagnosisTerm,
} from '../_shared/logic/safety.ts';
import {
  AnalyzeInputSchema,
  type Assessment,
  AssessmentSchema,
  CheckinCompareSchema,
  CONFIDENCE_VALUE,
  type Observations,
  ObservationsSchema,
} from '../_shared/logic/schemas.ts';
import { inferTags } from '../_shared/logic/tags.ts';
import { createTrainingPlan } from '../_shared/plans.ts';
import { PROMPT_VERSION, renderPrompt } from '../_shared/prompts.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

const MAX_INLINE_BYTES = 30 * 1024 * 1024; // Vertex-Inline-Limit mit Base64-Overhead
const SITUATION_LABEL: Record<string, string> = {
  walk: 'Spaziergang', home: 'zu Hause', visitors: 'Besuch', other_dog: 'anderer Hund', car: 'Auto', alone: 'allein', other: 'sonstiges',
};

type Media = {
  id: string; dog_id: string; owner_id: string; storage_path: string; type: 'photo' | 'video';
  user_question: string | null; is_unwanted: boolean | null; situation: string | null;
  plan_checkin_id: string | null; status: string;
};

serve(async (req) => {
  const user = await requireUser(req);
  const parsed = AnalyzeInputSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'invalid_input');
  const admin = adminClient();
  const { data: media } = await admin.from('media_uploads').select('*').eq('id', parsed.data.media_id).single<Media>();
  if (!media || media.owner_id !== user.id) throw new HttpError(404, 'not_found');
  if (media.status !== 'queued' && media.status !== 'failed') return json({ status: media.status });

  await admin.from('media_uploads').update({ status: 'analyzing', error: null }).eq('id', media.id);
  // @ts-ignore EdgeRuntime ist in Supabase Edge Functions global verfügbar
  EdgeRuntime.waitUntil(run(media).catch(async (e) => {
    console.error('analyze-media', media.id, e);
    await admin.from('media_uploads').update({ status: 'failed', error: 'analysis_failed' }).eq('id', media.id);
  }));
  return json({ status: 'analyzing' }, 202);
});

async function run(media: Media) {
  const admin = adminClient();
  const ctx = await loadDogContext(media.dog_id);

  // 1. Medium laden
  const { data: file, error: dlError } = await admin.storage.from('media').download(media.storage_path);
  if (dlError || !file) throw dlError ?? new Error('download_failed');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_INLINE_BYTES) throw new Error('file_too_large');
  const mimeType = file.type || (media.type === 'video' ? 'video/mp4' : 'image/jpeg');

  const wantedLabel = media.is_unwanted == null ? 'nicht angegeben' : media.is_unwanted ? 'unerwünscht' : 'gewollt';
  const situation = SITUATION_LABEL[media.situation ?? ''] ?? 'nicht angegeben';

  // 2. Beobachtungen (Gemini)
  const observePrompt = await renderPrompt('observe_media', {
    media_type: media.type === 'video' ? 'Video' : 'Foto',
    situation, user_question: media.user_question, wanted_label: wantedLabel,
    dog_summary: ctx.profileText.split('\n').slice(0, 4).join('; '),
  }, ObservationsSchema);
  const observed = await geminiJson(ObservationsSchema, observePrompt, { mimeType, base64: toBase64(bytes) });
  const observations: Observations = observed.data;

  // Check-in: Vergleich statt neuer Einschätzung
  if (media.plan_checkin_id) {
    await runCheckin(media, observations, observed.model, ctx.profileText);
    return;
  }

  // 3. Einschätzung (Claude)
  const knowledge = await retrieveKnowledge(inferTags({
    text: `${media.user_question ?? ''} ${observations.behavior_summary} ${observations.triggers.join(' ')}`,
    situation: media.situation, phaseKey: ctx.phase?.current.phase_key,
  }));
  const assessPrompt = await renderPrompt('assess_behavior', {
    dog_profile: ctx.profileText, observations, user_question: media.user_question,
    wanted_label: wantedLabel, situation, knowledge, health_context: 'noch nicht verfügbar',
  }, AssessmentSchema);
  const assessed = await claudeJson(AssessmentSchema, assessPrompt, {
    check: (a: Assessment) =>
      anyAversive([a.answer_md, a.assessment?.reasoning, ...a.safety_measures]) ? 'Antwort enthält aversive Methoden' : null,
  });
  const a = assessed.data;

  // 4. Harte Sicherheitsregeln serverseitig
  const decision = decideSafety({ observations, assessment: a, userQuestion: media.user_question, isUnwanted: media.is_unwanted });
  const answer = replaceDiagnosisTerm([decision.notice, a.answer_md].filter(Boolean).join('\n\n'));

  const { data: analysis, error } = await admin.from('analyses').insert({
    media_id: media.id,
    observations,
    result_type: decision.result_type,
    assessment: {
      headline: replaceDiagnosisTerm(a.headline),
      ...(a.assessment && decision.result_type === 'assessment' ? a.assessment : {}),
      safety_measures: a.safety_measures,
      retake_request: decision.result_type === 'retake' ? a.retake_request ?? observations.unusable_reason : null,
      uncertainties: [...a.uncertainties, ...observations.uncertainties],
    },
    answer_md: answer,
    safety_flag: decision.safety_flag,
    confidence: a.assessment ? CONFIDENCE_VALUE[a.assessment.confidence] : null,
    model_versions: { observe: observed.model, assess: assessed.model, prompt_version: PROMPT_VERSION },
  }).select('id').single();
  if (error || !analysis) throw error ?? new Error('insert_failed');

  // 5. Trainingsplan nur, wenn die Sicherheitsregeln es erlauben
  if (decision.allow_plan && a.plan_goal) {
    const res = await createTrainingPlan({
      dogId: media.dog_id, analysisId: analysis.id, goal: a.plan_goal,
      assessmentText: `${a.headline}\n${a.assessment?.likely_cause ?? ''}\n${a.answer_md}`,
    });
    if (!res.ok) {
      await admin.from('analyses').update({
        assessment: { headline: a.headline, ...(a.assessment ?? {}), plan_status: res.reason },
      }).eq('id', analysis.id);
    }
  }
  await admin.from('media_uploads').update({ status: 'done' }).eq('id', media.id);
}

async function runCheckin(media: Media, after: Observations, observeModel: string, profileText: string) {
  const admin = adminClient();
  const { data: checkin } = await admin.from('plan_checkins')
    .select('id, plan_id, plan:training_plans(id, dog_id, goal, summary, analysis_id, status)')
    .eq('id', media.plan_checkin_id!).single();
  const plan = checkin?.plan as unknown as { id: string; dog_id: string; goal: string; summary: string; analysis_id: string | null; status: string } | null;
  if (!checkin || !plan) throw new Error('checkin_not_found');

  const { data: before } = plan.analysis_id
    ? await admin.from('analyses').select('observations').eq('id', plan.analysis_id).single()
    : { data: null };
  const { data: tasks } = await admin.from('plan_tasks').select('day_index, title, done_at, rating').eq('plan_id', plan.id).order('day_index');

  const prompt = await renderPrompt('plan_checkin_compare', {
    before: before?.observations ?? 'keine Ausgangsaufnahme', after,
    plan: { goal: plan.goal, summary: plan.summary, tasks }, dog_profile: profileText,
  }, CheckinCompareSchema);
  const { data: cmp, model } = await claudeJson(CheckinCompareSchema, prompt, {
    check: (c) => (anyAversive([c.summary, c.reasoning]) ? 'aversive Methoden' : null),
  });
  const unusable = !after.usable || !after.dog_visible;
  const safety = unusable ? 'unusable' : after.health_signs.length ? 'vet' : cmp.safety_flag;
  const comparison = { ...cmp, summary: replaceDiagnosisTerm(cmp.summary), safety_flag: safety, models: { observe: observeModel, compare: model } };
  await admin.from('plan_checkins').update({ media_id: media.id, comparison }).eq('id', checkin.id);

  if (safety === 'vet' || safety === 'aggression' || cmp.adjustment === 'stop_and_refer') {
    await admin.from('training_plans').update({ status: 'cancelled' }).eq('id', plan.id);
  } else if (!unusable && ['extend', 'simplify', 'next_level'].includes(cmp.adjustment)) {
    await createTrainingPlan({
      dogId: plan.dog_id, analysisId: plan.analysis_id, goal: plan.goal, previousPlanId: plan.id,
      assessmentText: plan.summary, adjustment: `${cmp.adjustment}: ${cmp.reasoning}`,
    });
  }
  await admin.from('media_uploads').update({ status: 'done' }).eq('id', media.id);
}
