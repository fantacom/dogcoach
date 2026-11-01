import { filterContent } from '../forumFilter';

describe('filterContent', () => {
  it('lässt normale Fragen durch', () => {
    expect(filterContent('Leinenführigkeit', 'Mein Junghund zieht stark. Was kann ich tun?')).toEqual({ ok: true });
  });
  it.each([
    ['Du Arschloch', 'profanity'],
    ['Du H.u.r.e.n.s.o.h.n', 'ok'],
    ['Schau auf www.beispiel.de', 'link'],
    ['https://spam.xyz', 'link'],
    ['Schreib mir an a@b.de', 'contact'],
    ['Ruf an: +49 170 1234567', 'contact'],
    ['Jetzt kaufen!!! Rabattcode HUND', 'spam'],
    ['HALLOOOOOOOOOO', 'spam'],
    ['DAS IST EIN GANZ LAUTER TEXT IN GROSSBUCHSTABEN OHNE ENDE', 'spam'],
  ])('%s → %s', (text, expected) => {
    const r = filterContent(text);
    expect(r.ok ? 'ok' : r.reason).toBe(expected);
  });
});
