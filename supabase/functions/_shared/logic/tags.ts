/** Ableitung von Wissens-Tags aus Freitext/Situation für das Retrieval (CLAUDE.md §6). */
const RULES: [RegExp, string[]][] = [
  [/leine|zieht|zerrt/i, ['leash_pulling', 'walk']],
  [/bell|kläff|jault|heult/i, ['barking']],
  [/allein|alleine|trennung/i, ['separation', 'alone']],
  [/angst|ängstlich|unsicher|zittert|schreckhaft|panik/i, ['fear', 'anxiety', 'stress']],
  [/andere(n)? hund|hundebegegnung|pöbel|ausrast|reagiert auf hund/i, ['reactivity', 'other_dog']],
  [/spring|hochspring|begrüß/i, ['jumping', 'impulse_control']],
  [/zwick|knabber|beißt.*(spiel|hand|hose)|welpe beißt/i, ['mouthing']],
  [/stubenrein|pinkel|uriniert|kot|markier/i, ['house_training']],
  [/knurr|verteidig|futter|napf|knochen|spielzeug weg/i, ['resource_guarding']],
  [/jagt|jagd|wild|katze|hase|reh|vogel|hetz/i, ['prey']],
  [/rückruf|kommt nicht|hört nicht|abhauen|läuft weg/i, ['recall']],
  [/körpersprache|was bedeutet|warum macht/i, ['body_language']],
];
const SITUATION_TAGS: Record<string, string[]> = {
  walk: ['walk'], home: ['home'], visitors: ['visitors'], other_dog: ['other_dog', 'reactivity'],
  alone: ['alone', 'separation'], car: ['stress'], other: [],
};

export function inferTags(input: { text?: string | null; situation?: string | null; phaseKey?: string | null }): string[] {
  const tags = new Set<string>(['basics']);
  const text = input.text ?? '';
  for (const [re, t] of RULES) if (re.test(text)) t.forEach((x) => tags.add(x));
  for (const t of SITUATION_TAGS[input.situation ?? ''] ?? []) tags.add(t);
  if (input.phaseKey) tags.add(input.phaseKey);
  return [...tags];
}
