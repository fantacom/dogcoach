import { breedToTraits, computeTemperament, isValidAnswer, QUESTIONS, scoreAnswers, traitLevel } from '../temperament';

describe('Wesensprofil', () => {
  it('hat 10–15 Fragen mit eindeutigen Schlüsseln', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(10);
    expect(QUESTIONS.length).toBeLessThanOrEqual(15);
    expect(new Set(QUESTIONS.map((q) => q.key)).size).toBe(QUESTIONS.length);
  });
  it('mittelt Antworten je Merkmal', () => {
    expect(scoreAnswers({ energy_home: 'restless', energy_walk: 'hour' })).toEqual({ energy: 4 });
  });
  it('mischt 70 % Antworten mit 30 % Rasse', () => {
    const t = computeTemperament({ energy_home: 'calm', energy_walk: 'short' }, [{ energy: 5, independence: 2 }]);
    expect(t.energy).toBe(2.2);
    expect(t.attachment).toBe(4); // nur Rasse: 6 - 2
  });
  it('mittelt bei Mischlingen beide Rassen', () => {
    expect(breedToTraits([{ energy: 5 }, { energy: 1 }]).energy).toBe(3);
  });
  it('stuft Werte ein und validiert Antworten', () => {
    expect([traitLevel(2), traitLevel(3), traitLevel(4)]).toEqual(['low', 'mid', 'high']);
    expect(isValidAnswer('noises', 'panics')).toBe(true);
    expect(isValidAnswer('noises', 'egal')).toBe(false);
  });
});
