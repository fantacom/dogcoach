/** Entwicklungsphase aus Geburtsdatum und Größenklasse (CLAUDE.md §3.2). Reine Funktionen. */
import { addDays, daysBetween } from './time.ts';

export const SIZE_CLASSES = ['small', 'medium', 'large', 'giant'] as const;
export type SizeClass = (typeof SIZE_CLASSES)[number];
export const PHASE_KEYS = ['puppy', 'socialization', 'junior', 'adolescence', 'adult', 'senior'] as const;
export type PhaseKey = (typeof PHASE_KEYS)[number];

export type PhaseContent = {
  label: string;
  typical: string[];
  needs: string[];
  focus: string[];
  size_note?: string;
};
export type PhaseRow = {
  size_class: SizeClass;
  phase_key: PhaseKey;
  from_weeks: number;
  to_weeks: number | null;
  content: PhaseContent;
};
export type PhaseResult = {
  ageWeeks: number;
  sizeClass: SizeClass;
  current: PhaseRow;
  next: PhaseRow | null;
  nextStartDate: string | null;
};

const ORDER: Record<SizeClass, number> = { small: 0, medium: 1, large: 2, giant: 3 };

/**
 * Größenklasse: aus Rasse(n) – bei Mischlingen die größere der beiden –, sonst aus dem Gewicht.
 * Ohne Angaben: mittel.
 */
export function sizeClassFor(input: { breedSizes: (SizeClass | null | undefined)[]; weightKg?: number | null }): SizeClass {
  const known = input.breedSizes.filter((s): s is SizeClass => !!s);
  if (known.length > 0) return known.reduce((a, b) => (ORDER[b] > ORDER[a] ? b : a));
  const w = input.weightKg;
  if (w == null) return 'medium';
  if (w < 10) return 'small';
  if (w < 25) return 'medium';
  if (w < 45) return 'large';
  return 'giant';
}

export function ageInWeeks(birthDate: string, today: string): number {
  return Math.max(0, Math.floor(daysBetween(birthDate, today) / 7));
}

export function computePhase(input: {
  birthDate: string | null;
  sizeClass: SizeClass;
  phases: PhaseRow[];
  today: string;
}): PhaseResult | null {
  if (!input.birthDate) return null;
  const rows = input.phases
    .filter((p) => p.size_class === input.sizeClass)
    .sort((a, b) => a.from_weeks - b.from_weeks);
  if (rows.length === 0) return null;
  const ageWeeks = ageInWeeks(input.birthDate, input.today);
  const idx = rows.findIndex((p) => ageWeeks >= p.from_weeks && (p.to_weeks == null || ageWeeks < p.to_weeks));
  const currentIdx = idx === -1 ? rows.length - 1 : idx;
  const current = rows[currentIdx]!;
  const next = rows[currentIdx + 1] ?? null;
  return {
    ageWeeks,
    sizeClass: input.sizeClass,
    current,
    next,
    nextStartDate: next ? addDays(input.birthDate, next.from_weeks * 7) : null,
  };
}

/** Geschätztes Alter (Jahre/Monate) → Geburtsdatum. */
export function birthDateFromEstimate(years: number, months: number, today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - (years * 12 + months));
  return d.toISOString().slice(0, 10);
}
