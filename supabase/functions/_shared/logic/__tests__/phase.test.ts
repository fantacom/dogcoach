import { ageInWeeks, birthDateFromEstimate, computePhase, type PhaseRow, sizeClassFor } from '../phase';

const content = (label: string) => ({ label, typical: [], needs: [], focus: [] });
const phases: PhaseRow[] = [
  { size_class: 'large', phase_key: 'puppy', from_weeks: 0, to_weeks: 8, content: content('Welpe') },
  { size_class: 'large', phase_key: 'socialization', from_weeks: 8, to_weeks: 16, content: content('Sozialisierung') },
  { size_class: 'large', phase_key: 'junior', from_weeks: 16, to_weeks: 30, content: content('Junghund') },
  { size_class: 'large', phase_key: 'adolescence', from_weeks: 30, to_weeks: 104, content: content('Pubertät') },
  { size_class: 'large', phase_key: 'adult', from_weeks: 104, to_weeks: 364, content: content('Erwachsen') },
  { size_class: 'large', phase_key: 'senior', from_weeks: 364, to_weeks: null, content: content('Senior') },
  { size_class: 'small', phase_key: 'adult', from_weeks: 52, to_weeks: 520, content: content('Erwachsen') },
];

describe('sizeClassFor', () => {
  it('nimmt bei Mischlingen die größere Elternrasse', () => {
    expect(sizeClassFor({ breedSizes: ['small', 'large'] })).toBe('large');
  });
  it('nutzt sonst das Gewicht', () => {
    expect(sizeClassFor({ breedSizes: [null], weightKg: 8 })).toBe('small');
    expect(sizeClassFor({ breedSizes: [], weightKg: 24.9 })).toBe('medium');
    expect(sizeClassFor({ breedSizes: [], weightKg: 30 })).toBe('large');
    expect(sizeClassFor({ breedSizes: [], weightKg: 60 })).toBe('giant');
  });
  it('ohne Angaben: mittel', () => expect(sizeClassFor({ breedSizes: [] })).toBe('medium'));
});

describe('computePhase', () => {
  it('ohne Geburtsdatum keine Phase', () => {
    expect(computePhase({ birthDate: null, sizeClass: 'large', phases, today: '2026-11-01' })).toBeNull();
  });
  it('Welpe mit 10 Wochen ist in der Sozialisierung, nächste Phase mit Datum', () => {
    const r = computePhase({ birthDate: '2026-08-23', sizeClass: 'large', phases, today: '2026-11-01' })!;
    expect(r.ageWeeks).toBe(10);
    expect(r.current.phase_key).toBe('socialization');
    expect(r.next?.phase_key).toBe('junior');
    expect(r.nextStartDate).toBe('2026-12-13');
  });
  it('Grenzen: genau 16 Wochen = Junghund', () => {
    expect(computePhase({ birthDate: '2026-07-12', sizeClass: 'large', phases, today: '2026-11-01' })!.current.phase_key).toBe('junior');
  });
  it('Senior hat keine nächste Phase', () => {
    const r = computePhase({ birthDate: '2018-01-01', sizeClass: 'large', phases, today: '2026-11-01' })!;
    expect(r.current.phase_key).toBe('senior');
    expect(r.next).toBeNull();
  });
  it('Größenklassen haben eigene Grenzen', () => {
    expect(computePhase({ birthDate: '2024-11-01', sizeClass: 'small', phases, today: '2026-11-01' })!.current.phase_key).toBe('adult');
    expect(computePhase({ birthDate: '2024-11-01', sizeClass: 'large', phases, today: '2026-11-01' })!.current.phase_key).toBe('adult');
    expect(computePhase({ birthDate: '2025-06-01', sizeClass: 'large', phases, today: '2026-11-01' })!.current.phase_key).toBe('adolescence');
  });
});

describe('Alter', () => {
  it('rechnet Wochen und geschätzte Geburtsdaten', () => {
    expect(ageInWeeks('2026-10-25', '2026-11-01')).toBe(1);
    expect(ageInWeeks('2026-12-01', '2026-11-01')).toBe(0);
    expect(birthDateFromEstimate(2, 0, '2026-11-01')).toBe('2024-11-01');
  });
});
