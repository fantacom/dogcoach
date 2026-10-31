import de from '@/i18n/de.json';

function leaves(obj: object, prefix = ''): [string, unknown][] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' ? leaves(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
}

describe('de.json', () => {
  it('enthält nur nicht-leere Texte', () => {
    for (const [key, value] of leaves(de)) {
      expect({ key, ok: typeof value === 'string' && value.trim().length > 0 }).toEqual({
        key,
        ok: true,
      });
    }
  });

  it('verwendet die Du-Form (kein „Sie“/„Ihr“ als Anrede)', () => {
    for (const [key, value] of leaves(de)) {
      expect({ key, siezt: /\b(Sie|Ihnen|Ihre?[nmrs]?)\b/.test(String(value)) }).toEqual({
        key,
        siezt: false,
      });
    }
  });
});
