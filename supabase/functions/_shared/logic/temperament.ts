/**
 * Wesens-Fragebogen (CLAUDE.md §3.1) und Berechnung des Wesensprofils.
 * Fragetexte stehen in src/i18n/de.json unter temperament.questions.<key>.
 * Profil = 70 % individuelle Antworten + 30 % Rassen-Basisprofil (wenn vorhanden).
 */

export const TRAITS = [
  'energy',
  'sociability_people',
  'sociability_dogs',
  'anxiety',
  'prey_drive',
  'attachment',
] as const;
export type Trait = (typeof TRAITS)[number];
export type Traits = Partial<Record<Trait, number>>;

type Option = { key: string; scores: Partial<Record<Trait, number>> };
type Question = { key: string; options: Option[] };

/** 12 Fragen, jede Option vergibt Werte 1–5 für ein oder mehrere Merkmale. */
export const QUESTIONS: Question[] = [
  { key: 'energy_home', options: [
    { key: 'calm', scores: { energy: 1 } },
    { key: 'moderate', scores: { energy: 3 } },
    { key: 'restless', scores: { energy: 5 } },
  ] },
  { key: 'energy_walk', options: [
    { key: 'short', scores: { energy: 1 } },
    { key: 'hour', scores: { energy: 3 } },
    { key: 'never_tired', scores: { energy: 5 } },
  ] },
  { key: 'strangers', options: [
    { key: 'friendly', scores: { sociability_people: 5, anxiety: 1 } },
    { key: 'reserved', scores: { sociability_people: 3, anxiety: 2 } },
    { key: 'avoids', scores: { sociability_people: 2, anxiety: 4 } },
    { key: 'barks_growls', scores: { sociability_people: 1, anxiety: 4 } },
  ] },
  { key: 'other_dogs', options: [
    { key: 'plays', scores: { sociability_dogs: 5 } },
    { key: 'selective', scores: { sociability_dogs: 3 } },
    { key: 'ignores', scores: { sociability_dogs: 3 } },
    { key: 'tense', scores: { sociability_dogs: 1, anxiety: 3 } },
  ] },
  { key: 'leash_dogs', options: [
    { key: 'relaxed', scores: { sociability_dogs: 5 } },
    { key: 'pulls_towards', scores: { sociability_dogs: 4, energy: 4 } },
    { key: 'barks_lunges', scores: { sociability_dogs: 2, anxiety: 3 } },
  ] },
  { key: 'noises', options: [
    { key: 'unbothered', scores: { anxiety: 1 } },
    { key: 'startles_recovers', scores: { anxiety: 3 } },
    { key: 'panics', scores: { anxiety: 5 } },
  ] },
  { key: 'new_places', options: [
    { key: 'curious', scores: { anxiety: 1 } },
    { key: 'cautious', scores: { anxiety: 3 } },
    { key: 'stressed', scores: { anxiety: 5 } },
  ] },
  { key: 'wildlife', options: [
    { key: 'no_interest', scores: { prey_drive: 1 } },
    { key: 'watches', scores: { prey_drive: 3 } },
    { key: 'chases', scores: { prey_drive: 5 } },
  ] },
  { key: 'moving_things', options: [
    { key: 'ignores', scores: { prey_drive: 1 } },
    { key: 'interested', scores: { prey_drive: 3 } },
    { key: 'must_chase', scores: { prey_drive: 5 } },
  ] },
  { key: 'alone', options: [
    { key: 'fine', scores: { attachment: 2, anxiety: 1 } },
    { key: 'unhappy_short', scores: { attachment: 3, anxiety: 3 } },
    { key: 'cannot', scores: { attachment: 5, anxiety: 5 } },
  ] },
  { key: 'follows', options: [
    { key: 'independent', scores: { attachment: 1 } },
    { key: 'sometimes', scores: { attachment: 3 } },
    { key: 'everywhere', scores: { attachment: 5 } },
  ] },
  { key: 'recall_off_leash', options: [
    { key: 'stays_close', scores: { attachment: 5, prey_drive: 2 } },
    { key: 'comes_mostly', scores: { attachment: 3 } },
    { key: 'own_way', scores: { attachment: 1, prey_drive: 4 } },
  ] },
];

export type Answers = Record<string, string>;
export type BreedTraits = Partial<Record<
  'energy' | 'trainability' | 'sociability_people' | 'sociability_dogs' | 'prey_drive' | 'sensitivity' | 'guarding' | 'independence',
  number
>>;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Rassen-Basisprofil auf die Fragebogen-Merkmale abbilden. */
export function breedToTraits(breeds: BreedTraits[]): Traits {
  if (breeds.length === 0) return {};
  const avg = (k: keyof BreedTraits) => {
    const v = breeds.map((b) => b[k]).filter((x): x is number => typeof x === 'number');
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
  };
  const out: Traits = {};
  const set = (t: Trait, v: number | undefined) => {
    if (v !== undefined) out[t] = round1(v);
  };
  set('energy', avg('energy'));
  set('sociability_people', avg('sociability_people'));
  set('sociability_dogs', avg('sociability_dogs'));
  set('prey_drive', avg('prey_drive'));
  const indep = avg('independence');
  set('attachment', indep === undefined ? undefined : 6 - indep);
  // Ängstlichkeit ist individuell – kein Rassenwert
  return out;
}

export function scoreAnswers(answers: Answers): Traits {
  const sums: Partial<Record<Trait, { s: number; n: number }>> = {};
  for (const q of QUESTIONS) {
    const opt = q.options.find((o) => o.key === answers[q.key]);
    if (!opt) continue;
    for (const [t, v] of Object.entries(opt.scores) as [Trait, number][]) {
      const cur = sums[t] ?? { s: 0, n: 0 };
      sums[t] = { s: cur.s + v, n: cur.n + 1 };
    }
  }
  const out: Traits = {};
  for (const [t, { s, n }] of Object.entries(sums) as [Trait, { s: number; n: number }][]) {
    out[t] = round1(s / n);
  }
  return out;
}

export function computeTemperament(answers: Answers, breeds: BreedTraits[]): Traits {
  const individual = scoreAnswers(answers);
  const base = breedToTraits(breeds);
  const out: Traits = {};
  for (const t of TRAITS) {
    const i = individual[t];
    const b = base[t];
    if (i !== undefined && b !== undefined) out[t] = round1(0.7 * i + 0.3 * b);
    else if (i !== undefined) out[t] = i;
    else if (b !== undefined) out[t] = b;
  }
  return out;
}

export type TraitLevel = 'low' | 'mid' | 'high';
export const traitLevel = (v: number): TraitLevel => (v < 2.5 ? 'low' : v < 3.75 ? 'mid' : 'high');

export function isValidAnswer(questionKey: string, optionKey: string): boolean {
  return QUESTIONS.some((q) => q.key === questionKey && q.options.some((o) => o.key === optionKey));
}
