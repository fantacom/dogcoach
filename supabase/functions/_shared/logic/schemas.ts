/**
 * Zod-Schemas für alle KI-Ausgaben (CLAUDE.md §7) und Function-Inputs.
 * Ausgabe-Schemas bewusst ohne Längen-/Zahlengrenzen (Structured Outputs akzeptieren nicht jede
 * JSON-Schema-Einschränkung). Grenzen setzt danach sanitize*() bzw. safety.ts.
 */
import { z } from 'zod';

// ---------------------------------------------------------------- Beobachtungen (Gemini)
export const ObservationsSchema = z.object({
  usable: z.boolean(),
  unusable_reason: z.string().nullable(),
  dog_visible: z.boolean(),
  body_language: z.object({
    tail: z.string(),
    ears: z.string(),
    posture: z.string(),
    gaze: z.string(),
    mouth: z.string(),
  }),
  behavior_summary: z.string(),
  triggers: z.array(z.string()),
  intensity: z.number(),
  directed_at: z.enum(['none', 'humans', 'dogs', 'other_animals', 'objects', 'unclear']),
  context: z.string(),
  health_signs: z.array(z.string()),
  uncertainties: z.array(z.string()),
});
export type Observations = z.infer<typeof ObservationsSchema>;

// ---------------------------------------------------------------- Einschätzung (Claude)
export const RESULT_TYPES = ['answer', 'assessment', 'vet_referral', 'trainer_referral', 'retake'] as const;
export const SAFETY_FLAGS = ['none', 'vet', 'aggression', 'unusable'] as const;
export type ResultType = (typeof RESULT_TYPES)[number];
export type SafetyFlag = (typeof SAFETY_FLAGS)[number];

export const AssessmentSchema = z.object({
  result_type: z.enum(RESULT_TYPES),
  safety_flag: z.enum(SAFETY_FLAGS),
  headline: z.string(),
  answer_md: z.string(),
  assessment: z
    .object({
      likely_cause: z.string(),
      alternative_hypotheses: z.array(z.string()),
      confidence: z.enum(['low', 'medium', 'high']),
      reasoning: z.string(),
    })
    .nullable(),
  safety_measures: z.array(z.string()),
  retake_request: z.string().nullable(),
  plan_recommended: z.boolean(),
  plan_goal: z.string().nullable(),
  uncertainties: z.array(z.string()),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const CONFIDENCE_VALUE = { low: 0.35, medium: 0.6, high: 0.85 } as const;

// ---------------------------------------------------------------- Trainingsplan (Claude)
export const PlanTaskSchema = z.object({
  day_index: z.number(),
  title: z.string(),
  exercise: z.string(),
  goal: z.string(),
  steps: z.array(z.string()),
  duration_min: z.number(),
  success_criteria: z.string(),
  typical_mistake: z.string(),
});
export const TrainingPlanSchema = z.object({
  goal: z.string(),
  summary: z.string(),
  duration_weeks: z.number(),
  tasks: z.array(PlanTaskSchema),
  checkins: z.array(z.object({ day_index: z.number(), instruction: z.string() })),
});
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;

// ---------------------------------------------------------------- Check-in-Vergleich (Claude)
export const CheckinCompareSchema = z.object({
  progress: z.enum(['improved', 'unchanged', 'worse', 'unclear']),
  summary: z.string(),
  adjustment: z.enum(['extend', 'simplify', 'next_level', 'keep', 'stop_and_refer']),
  reasoning: z.string(),
  safety_flag: z.enum(SAFETY_FLAGS),
});
export type CheckinCompare = z.infer<typeof CheckinCompareSchema>;

// ---------------------------------------------------------------- Coach-Tipps (Claude)
export const TIP_CATEGORIES = ['exercise', 'training', 'nutrition', 'grooming', 'health_reminder', 'social'] as const;
export const CoachTipsSchema = z.object({
  tips: z.array(
    z.object({
      category: z.enum(TIP_CATEGORIES),
      topic_key: z.string(),
      title: z.string(),
      body: z.string(),
      priority: z.number(),
    }),
  ),
});
export type CoachTips = z.infer<typeof CoachTipsSchema>;

// ---------------------------------------------------------------- Forum-Antwort (Claude)
export const ForumReplySchema = z.object({
  body_md: z.string(),
  safety_flag: z.enum(['none', 'vet', 'aggression']),
  needs_human_expert: z.boolean(),
});
export type ForumReply = z.infer<typeof ForumReplySchema>;

// ---------------------------------------------------------------- Sanitizer
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function sanitizePlan(plan: TrainingPlan): TrainingPlan {
  const weeks = clamp(plan.duration_weeks, 1, 6);
  const maxDay = weeks * 7 - 1;
  const seen = new Set<number>();
  const tasks = plan.tasks
    .map((t) => ({
      ...t,
      day_index: clamp(t.day_index, 0, maxDay),
      duration_min: clamp(t.duration_min, 2, 60),
      title: cut(t.title, 80),
      steps: t.steps.slice(0, 10).map((s) => cut(s, 300)),
    }))
    .filter((t) => (seen.has(t.day_index) ? false : (seen.add(t.day_index), true)))
    .sort((a, b) => a.day_index - b.day_index);
  const checkins = plan.checkins
    .map((c) => ({ ...c, day_index: clamp(c.day_index, 1, maxDay) }))
    .slice(0, 4);
  return { ...plan, duration_weeks: weeks, goal: cut(plan.goal, 200), tasks, checkins };
}

export function sanitizeTips(tips: CoachTips, max = 3): CoachTips {
  return {
    tips: tips.tips.slice(0, max).map((t) => ({
      ...t,
      topic_key: t.topic_key.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 60),
      title: cut(t.title, 80),
      body: cut(t.body, 600),
      priority: clamp(t.priority, 0, 2),
    })),
  };
}

// ---------------------------------------------------------------- Function-Inputs
export const AnalyzeInputSchema = z.object({ media_id: z.uuid() });

export const FORUM_CATEGORIES = ['training', 'behavior', 'puppy', 'nutrition', 'health', 'everyday', 'other'] as const;
export const ForumPostInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('post'),
    category: z.enum(FORUM_CATEGORIES),
    title: z.string().trim().min(5).max(120),
    body: z.string().trim().min(10).max(4000),
    dog_id: z.uuid().nullable().optional(),
    image_path: z.string().max(300).nullable().optional(),
  }),
  z.object({
    kind: z.literal('reply'),
    post_id: z.uuid(),
    body: z.string().trim().min(2).max(4000),
  }),
]);
export type ForumPostInput = z.infer<typeof ForumPostInputSchema>;

export const RevenueCatEventSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string(),
    entitlement_ids: z.array(z.string()).nullable().optional(),
    expiration_at_ms: z.number().nullable().optional(),
  }),
});
