/**
 * Einfacher automatischer Vorfilter für Community-Beiträge (CLAUDE.md §3.5, App Store 1.2):
 * Wortliste, Links, Spam-Muster. Läuft in der Edge Function forum-post vor dem Speichern
 * und zusätzlich im Client (sofortige Rückmeldung).
 */

export type FilterResult = { ok: true } | { ok: false; reason: 'profanity' | 'link' | 'spam' | 'contact' };

// Bewusst kurze, eindeutige Liste (Beleidigungen/Hassbegriffe). Erweiterbar.
const BLOCKED_WORDS = [
  'arschloch', 'wichser', 'hurensohn', 'fotze', 'missgeburt', 'spast', 'behindert du',
  'schlampe', 'nutte', 'kanake', 'neger', 'schwuchtel', 'idiot du', 'halt die fresse', 'verpiss dich',
  'fick dich', 'scheiss auf dich', 'scheiß auf dich', 'tierquäler du', 'drecksau',
];

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(de|com|net|org|at|ch|eu|io|info|biz|shop|xyz|ru|ly|me)\b)/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE = /(\+?\d[\d\s/()-]{8,}\d)/;
const REPEATED_CHAR = /(.)\1{7,}/;
const SPAM_WORDS = /(gratis|kostenlos|verdienen sie|bitcoin|crypto|casino|whatsapp mich|dm me|rabattcode|gutscheincode|jetzt kaufen)/i;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0@]/g, (c) => (c === '0' ? 'o' : 'a'))
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/\s+/g, ' ');
}

export function filterContent(...parts: (string | null | undefined)[]): FilterResult {
  const text = parts.filter(Boolean).join('\n');
  const norm = normalize(text);
  if (BLOCKED_WORDS.some((w) => norm.includes(w))) return { ok: false, reason: 'profanity' };
  if (LINK.test(text)) return { ok: false, reason: 'link' };
  if (EMAIL.test(text) || PHONE.test(text)) return { ok: false, reason: 'contact' };
  if (REPEATED_CHAR.test(text) || SPAM_WORDS.test(text)) return { ok: false, reason: 'spam' };
  const letters = text.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
  if (letters.length > 30 && letters.replace(/[^A-ZÄÖÜ]/g, '').length / letters.length > 0.6) {
    return { ok: false, reason: 'spam' };
  }
  const words = norm.split(' ').filter((w) => w.length > 2);
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  if (words.length >= 10 && Math.max(...counts.values()) / words.length > 0.4) return { ok: false, reason: 'spam' };
  return { ok: true };
}
