/**
 * Harte Sicherheitsregeln (CLAUDE.md §3.4) – serverseitig, unabhängig davon, was das Modell liefert.
 * 1. Unbrauchbares Medium → neue Aufnahme anfordern, nichts raten.
 * 2. Hinweise auf Schmerz/Krankheit/Lahmheit/plötzliche Veränderung → „Bitte zuerst Tierarzt“, kein Plan.
 * 3. Ernsthafte Aggression (Beißvorfall, Intensität ≥ 4 gegen Menschen) → Fachleute, nur Sicherheitsmaßnahmen.
 * 4. Keine aversiven Methoden in Texten.
 * 5. „Einschätzung“ statt „Diagnose“.
 */
import type { Assessment, Observations, ResultType, SafetyFlag } from './schemas.ts';

const HEALTH_PATTERNS = [
  /humpel/i, /lahm/i, /hinkt/i, /schmerz/i, /blut/i, /erbrich|erbrech|übergeb/i, /durchfall/i,
  /krampf/i, /zitter.*(ständig|dauernd)/i, /frisst (nicht|nichts|kaum)/i, /trinkt (sehr viel|nicht)/i,
  /apathisch/i, /schlapp/i, /fieber/i, /atemnot|atmet schwer|hechelt.*(nachts|ohne grund)/i,
  /(plötzlich|seit kurzem|auf einmal).{0,40}(aggressiv|anders|verändert|ängstlich|unsauber)/i,
  /jault.{0,20}(berühr|anfass|hochheb)/i, /lahmheit/i, /verletz/i, /operation|op-narbe/i,
];

const BITE_PATTERNS = [/gebissen/i, /\bbiss\b/i, /beißt (menschen|leute|kinder|mich|uns|besuch)/i, /zugebissen/i, /beißvorfall/i];

/** Aversive Methoden – geprüft je Satz; Sätze mit Verneinung („kein Leinenruck“) sind erlaubt. */
const AVERSIVE_PATTERNS = [
  /leinenruck|an der leine ruck|ruck an der leine/i, /stachelhalsband|kettenwürger|würgehalsband|würger/i,
  /stromhalsband|teletak|sprühhalsband|antibellhalsband/i, /schreckreiz/i, /wurfkette|rappeldose|disc[- ]?scheiben/i,
  /mit wasser (be)?spritz|spritz\w*.{0,20}wasser|wasserpistole|sprühflasche/i, /alpha[- ]?(wurf|rolle)|auf den rücken (drücken|werfen)/i,
  /schnauzengriff/i, /(hund|ihn|sie) (schlagen|hauen|treten|anschreien)/i, /nackengriff|am nacken schütteln/i,
];
const NEGATION = /\b(nicht|nie|niemals|kein|keine|keinen|keinem|keiner|ohne|vermeide|verzichte|verboten|statt)\b/i;

export function mentionsHealthIssue(...texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => !!t && HEALTH_PATTERNS.some((p) => p.test(t)));
}

export function mentionsBite(...texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => !!t && BITE_PATTERNS.some((p) => p.test(t)));
}

export function containsAversiveAdvice(text: string): boolean {
  return text
    .split(/(?<=[.!?\n])\s+/)
    .some((sentence) => AVERSIVE_PATTERNS.some((p) => p.test(sentence)) && !NEGATION.test(sentence));
}

export function replaceDiagnosisTerm(text: string): string {
  return text
    .replace(/\bDiagnosen\b/g, 'Einschätzungen')
    .replace(/\bDiagnose\b/g, 'Einschätzung')
    .replace(/\bdiagnostizier(t|en|e)\b/gi, 'eingeschätzt');
}

export type SafetyDecision = {
  result_type: ResultType;
  safety_flag: SafetyFlag;
  allow_plan: boolean;
  /** Text, der in jedem Fall vor der Antwort steht (z. B. Tierarzt-Hinweis). */
  notice: string | null;
};

export const VET_NOTICE =
  'Bitte lass deinen Hund zuerst beim Tierarzt untersuchen. Schmerzen oder Krankheit können Verhalten stark beeinflussen – erst danach ist Training sinnvoll.';
export const AGGRESSION_NOTICE =
  'Das sieht nach ernsthaftem Aggressionsverhalten aus. Bitte hol dir Unterstützung von einer zertifizierten Hundetrainerin bzw. einem zertifizierten Hundetrainer oder einer Verhaltenstierärztin bzw. einem Verhaltenstierarzt. Bis dahin helfen nur Sicherheitsmaßnahmen – bitte kein eigenes Training an diesem Verhalten.';
export const RETAKE_NOTICE =
  'Auf dieser Aufnahme kann ich deinen Hund nicht gut genug erkennen. Bitte nimm die Situation noch einmal auf: bei gutem Licht, der ganze Hund im Bild, möglichst ruhig gehalten.';

export function decideSafety(input: {
  observations: Observations;
  assessment: Assessment;
  userQuestion: string | null;
  isUnwanted: boolean | null;
}): SafetyDecision {
  const { observations: o, assessment: a, userQuestion } = input;

  if (!o.usable || !o.dog_visible || a.safety_flag === 'unusable' || a.result_type === 'retake') {
    return { result_type: 'retake', safety_flag: 'unusable', allow_plan: false, notice: RETAKE_NOTICE };
  }
  if (o.health_signs.length > 0 || a.safety_flag === 'vet' || a.result_type === 'vet_referral' || mentionsHealthIssue(userQuestion)) {
    return { result_type: 'vet_referral', safety_flag: 'vet', allow_plan: false, notice: VET_NOTICE };
  }
  const seriousAggression =
    (o.directed_at === 'humans' && o.intensity >= 4) || mentionsBite(userQuestion, o.behavior_summary, o.context);
  if (seriousAggression || a.safety_flag === 'aggression' || a.result_type === 'trainer_referral') {
    return { result_type: 'trainer_referral', safety_flag: 'aggression', allow_plan: false, notice: AGGRESSION_NOTICE };
  }
  const resultType: ResultType = a.result_type === 'assessment' ? 'assessment' : 'answer';
  return {
    result_type: resultType,
    safety_flag: 'none',
    allow_plan: resultType === 'assessment' && input.isUnwanted !== false && a.plan_recommended,
    notice: null,
  };
}

/** Prüft alle Texte eines KI-Ergebnisses. true = enthält aversive Ratschläge → verwerfen/Retry. */
export function anyAversive(texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => !!t && containsAversiveAdvice(t));
}
