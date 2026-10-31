import { isValidEmail, isValidOtp } from '@/lib/validation';

describe('isValidEmail', () => {
  it.each(['du@beispiel.de', ' hund@coach.ch ', 'a.b+c@d-e.at'])('akzeptiert %s', (v) => {
    expect(isValidEmail(v)).toBe(true);
  });
  it.each(['', 'du', 'du@', 'du@beispiel', 'du @beispiel.de'])('lehnt "%s" ab', (v) => {
    expect(isValidEmail(v)).toBe(false);
  });
});

describe('isValidOtp', () => {
  it('akzeptiert genau 6 Ziffern', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp(' 123456 ')).toBe(true);
  });
  it.each(['12345', '1234567', '12a456', ''])('lehnt "%s" ab', (v) => {
    expect(isValidOtp(v)).toBe(false);
  });
});
