import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import {
  AssessmentSchema,
  CheckinCompareSchema,
  CoachTipsSchema,
  ForumPostInputSchema,
  ForumReplySchema,
  ObservationsSchema,
  sanitizePlan,
  sanitizeTips,
  TrainingPlanSchema,
} from '../schemas';
import { inferTags } from '../tags';
import { zonedToUtc } from '../time';

const PROMPTS = join(__dirname, '..', '..', 'prompts');

describe('Prompt-Dateien', () => {
  const files = readdirSync(PROMPTS).filter((f) => f.endsWith('.md'));
  it('enthält alle 6 Prompts aus CLAUDE.md §7', () => {
    expect(files.sort()).toEqual([
      'assess_behavior.md', 'coach_tips.md', 'forum_reply.md', 'observe_media.md', 'plan_checkin_compare.md', 'training_plan.md',
    ]);
  });
  it.each(files)('%s: versioniert, Sicherheitsregeln, JSON-Schema, Du-Form', (f) => {
    const text = readFileSync(join(PROMPTS, f), 'utf8');
    expect(text).toMatch(/Version: \d+/);
    expect(text).toMatch(/Sicherheitsregeln/);
    expect(text).toMatch(/Tierarzt/);
    expect(text).toMatch(/Leinenruck/);
    expect(text).toMatch(/Du-Form/);
    expect(text).toMatch(/\{\{schema\}\}/);
  });
});

describe('Ausgabe-Schemas', () => {
  it.each([
    ['Observations', ObservationsSchema], ['Assessment', AssessmentSchema], ['TrainingPlan', TrainingPlanSchema],
    ['CheckinCompare', CheckinCompareSchema], ['CoachTips', CoachTipsSchema], ['ForumReply', ForumReplySchema],
  ] as const)('%s lässt sich als JSON-Schema ausgeben', (_n, schema) => {
    expect(z.toJSONSchema(schema)).toHaveProperty('type', 'object');
  });
  it('lehnt unvollständige Einschätzungen ab', () => {
    expect(AssessmentSchema.safeParse({ result_type: 'assessment' }).success).toBe(false);
    expect(AssessmentSchema.safeParse({ result_type: 'diagnose' }).success).toBe(false);
  });
  it('sanitizePlan begrenzt Dauer, Tage und entfernt Doppelungen', () => {
    const p = sanitizePlan({
      goal: 'Ziel', summary: 's', duration_weeks: 9,
      tasks: [
        { day_index: 50, title: 'A', exercise: 'e', goal: 'g', steps: ['1'], duration_min: 200, success_criteria: 'c', typical_mistake: 'm' },
        { day_index: 0, title: 'B', exercise: 'e', goal: 'g', steps: ['1'], duration_min: 5, success_criteria: 'c', typical_mistake: 'm' },
        { day_index: 0, title: 'C', exercise: 'e', goal: 'g', steps: ['1'], duration_min: 5, success_criteria: 'c', typical_mistake: 'm' },
      ],
      checkins: [{ day_index: 0, instruction: 'x' }],
    });
    expect(p.duration_weeks).toBe(6);
    expect(p.tasks.map((t) => [t.day_index, t.title])).toEqual([[0, 'B'], [41, 'A']]);
    expect(p.tasks[1]!.duration_min).toBe(60);
    expect(p.checkins[0]!.day_index).toBe(1);
  });
  it('sanitizeTips normalisiert topic_key und begrenzt Anzahl', () => {
    const t = sanitizeTips({ tips: Array.from({ length: 5 }, (_, i) => ({ category: 'training' as const, topic_key: `Rückruf ${i}`, title: 't', body: 'b', priority: 7 })) });
    expect(t.tips).toHaveLength(3);
    expect(t.tips[0]).toMatchObject({ topic_key: 'r_ckruf_0', priority: 2 });
  });
});

describe('Function-Inputs', () => {
  it('validiert Forum-Beiträge', () => {
    expect(ForumPostInputSchema.safeParse({ kind: 'post', category: 'training', title: 'Hallo Welt', body: 'Zehn Zeichen sind hier.' }).success).toBe(true);
    expect(ForumPostInputSchema.safeParse({ kind: 'post', category: 'training', title: 'Hi', body: 'kurz' }).success).toBe(false);
    expect(ForumPostInputSchema.safeParse({ kind: 'reply', post_id: 'x', body: 'ok' }).success).toBe(false);
  });
});

describe('Tags und Zeit', () => {
  it('leitet Wissens-Tags ab', () => {
    expect(inferTags({ text: 'Er zieht an der Leine und bellt', situation: 'walk', phaseKey: 'junior' }))
      .toEqual(expect.arrayContaining(['leash_pulling', 'barking', 'walk', 'junior', 'basics']));
  });
  it('rechnet lokale Zeit inkl. Sommerzeit in UTC um', () => {
    expect(zonedToUtc('2026-07-01', '18:00', 'Europe/Berlin').toISOString()).toBe('2026-07-01T16:00:00.000Z');
    expect(zonedToUtc('2026-12-01', '18:00', 'Europe/Berlin').toISOString()).toBe('2026-12-01T17:00:00.000Z');
    expect(zonedToUtc('2026-03-29', '09:00', 'Europe/Vienna').toISOString()).toBe('2026-03-29T07:00:00.000Z');
  });
});
