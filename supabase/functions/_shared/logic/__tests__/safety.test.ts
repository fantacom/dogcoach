import {
  containsAversiveAdvice,
  decideSafety,
  mentionsBite,
  mentionsHealthIssue,
  replaceDiagnosisTerm,
} from '../safety';
import type { Assessment, Observations } from '../schemas';

const obs = (o: Partial<Observations> = {}): Observations => ({
  usable: true, unusable_reason: null, dog_visible: true,
  body_language: { tail: 'neutral', ears: 'neutral', posture: 'locker', gaze: 'weich', mouth: 'offen' },
  behavior_summary: 'Hund zieht an der Leine', triggers: [], intensity: 2, directed_at: 'none',
  context: 'Straße', health_signs: [], uncertainties: [], ...o,
});
const assess = (a: Partial<Assessment> = {}): Assessment => ({
  result_type: 'assessment', safety_flag: 'none', headline: 'Leinenziehen', answer_md: 'Text',
  assessment: { likely_cause: 'Aufregung', alternative_hypotheses: [], confidence: 'medium', reasoning: 'r' },
  safety_measures: [], retake_request: null, plan_recommended: true, plan_goal: 'Lockere Leine', uncertainties: [], ...a,
});

describe('decideSafety', () => {
  it('erlaubt Plan bei unerwünschtem Verhalten ohne Warnsignale', () => {
    expect(decideSafety({ observations: obs(), assessment: assess(), userQuestion: 'Er zieht', isUnwanted: true }))
      .toEqual({ result_type: 'assessment', safety_flag: 'none', allow_plan: true, notice: null });
  });
  it('unbrauchbares Medium → neue Aufnahme, kein Plan', () => {
    const d = decideSafety({ observations: obs({ dog_visible: false }), assessment: assess(), userQuestion: null, isUnwanted: true });
    expect(d).toMatchObject({ result_type: 'retake', safety_flag: 'unusable', allow_plan: false });
  });
  it('Gesundheitszeichen im Bild → Tierarzt, kein Plan – auch wenn das Modell einen Plan will', () => {
    const d = decideSafety({ observations: obs({ health_signs: ['schont Hinterbein'] }), assessment: assess(), userQuestion: null, isUnwanted: true });
    expect(d).toMatchObject({ result_type: 'vet_referral', safety_flag: 'vet', allow_plan: false });
    expect(d.notice).toMatch(/Tierarzt/);
  });
  it('Gesundheitshinweis in der Frage → Tierarzt', () => {
    expect(decideSafety({ observations: obs(), assessment: assess(), userQuestion: 'Seit gestern humpelt sie und ist aggressiv', isUnwanted: true }).safety_flag).toBe('vet');
  });
  it('Aggression ≥ 4 gegen Menschen → Fachleute, kein Plan', () => {
    const d = decideSafety({ observations: obs({ directed_at: 'humans', intensity: 4 }), assessment: assess(), userQuestion: null, isUnwanted: true });
    expect(d).toMatchObject({ result_type: 'trainer_referral', safety_flag: 'aggression', allow_plan: false });
  });
  it('Beißvorfall in der Frage → Fachleute', () => {
    expect(decideSafety({ observations: obs(), assessment: assess(), userQuestion: 'Er hat meinen Sohn gebissen', isUnwanted: true }).safety_flag).toBe('aggression');
  });
  it('Aggression gegen Hunde mit Intensität 4 ist kein Automatismus für Überweisung', () => {
    expect(decideSafety({ observations: obs({ directed_at: 'dogs', intensity: 4 }), assessment: assess(), userQuestion: null, isUnwanted: true }).safety_flag).toBe('none');
  });
  it('gewolltes Verhalten → Antwort ohne Plan', () => {
    const d = decideSafety({ observations: obs(), assessment: assess({ result_type: 'answer', plan_recommended: false }), userQuestion: 'Ist das Spiel?', isUnwanted: false });
    expect(d).toMatchObject({ result_type: 'answer', allow_plan: false });
  });
});

describe('aversive Methoden', () => {
  it.each([
    'Gib ihm einen kurzen Leinenruck.',
    'Ein Stachelhalsband hilft hier.',
    'Wirf eine Wurfkette, wenn er bellt.',
    'Spritz ihn mit Wasser an.',
    'Mach einen Alphawurf.',
  ])('erkennt: %s', (t) => expect(containsAversiveAdvice(t)).toBe(true));
  it.each([
    'Bitte keinen Leinenruck verwenden.',
    'Verzichte auf Stachelhalsband und Würger.',
    'Belohne ruhiges Verhalten mit Futter.',
  ])('erlaubt: %s', (t) => expect(containsAversiveAdvice(t)).toBe(false));
});

describe('Hilfsfunktionen', () => {
  it('ersetzt Diagnose durch Einschätzung', () => {
    expect(replaceDiagnosisTerm('Meine Diagnose: Frust. Weitere Diagnosen folgen.')).toBe('Meine Einschätzung: Frust. Weitere Einschätzungen folgen.');
  });
  it('erkennt Gesundheits- und Beißhinweise', () => {
    expect(mentionsHealthIssue('Sie frisst nicht mehr')).toBe(true);
    expect(mentionsHealthIssue('Sie zieht an der Leine')).toBe(false);
    expect(mentionsBite('Er hat zugebissen')).toBe(true);
    expect(mentionsBite('Er beißt ins Spielzeug')).toBe(false);
  });
});
