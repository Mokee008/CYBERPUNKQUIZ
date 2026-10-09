import { describe, it, expect } from 'vitest';
import { buildEffect } from '../src/services/effects.js';

describe('Effect Directives Generator (buildEffect)', () => {
  it('generates paper_burst directive on correct answer', () => {
    const effect = buildEffect({
      correct: true,
      streak: 1,
      difficulty: 'easy',
      timedOut: false,
      correctIndex: 1
    });

    expect(effect.type).toBe('paper_burst');
    expect(effect.sound).toBe('paper_pop');
    expect(effect.durationMs).toBe(1600);
    expect(effect.shapes).toEqual(['rect', 'strip', 'curl']);
    expect(effect.palette).toContain('#EADFC8');
    expect(effect.particleCount).toBeGreaterThanOrEqual(70);
    expect(typeof effect.label).toBe('string');
  });

  it('generates bomb_blast directive on wrong answer', () => {
    const effect = buildEffect({
      correct: false,
      streak: 0,
      difficulty: 'medium',
      timedOut: false,
      correctIndex: 2
    });

    expect(effect.type).toBe('bomb_blast');
    expect(effect.sound).toBe('bomb_boom');
    expect(effect.durationMs).toBe(1800);
    expect(effect.phases).toHaveLength(5);
    expect(effect.label).toBe('Boom. It was C.');
    expect(effect.screenShake.amplitudePx).toBeGreaterThanOrEqual(10);
    expect(effect.screenShake.amplitudePx).toBeLessThanOrEqual(26);
  });

  it('generates bomb_blast directive with timeout phrasing on timedOut', () => {
    const effect = buildEffect({
      correct: false,
      streak: 0,
      difficulty: 'hard',
      timedOut: true,
      correctIndex: 0
    });

    expect(effect.type).toBe('bomb_blast');
    expect(effect.label).toBe('Expired. It was A.');
  });

  it('scales intensity and particleCount with streak and difficulty for paper_burst', () => {
    const low = buildEffect({ correct: true, streak: 0, difficulty: 'easy' });
    const high = buildEffect({ correct: true, streak: 8, difficulty: 'hard' });

    expect(high.intensity).toBeGreaterThan(low.intensity);
    expect(high.particleCount).toBeGreaterThan(low.particleCount);
  });

  it('scales screen shake and debris count with intensity for bomb_blast', () => {
    const low = buildEffect({ correct: false, streak: 0, difficulty: 'easy' });
    const max = buildEffect({ correct: false, streak: 6, difficulty: 'hard' }); // dropped high streak

    expect(max.intensity).toBe(5);
    expect(max.screenShake.amplitudePx).toBe(26);
    expect(max.debrisCount).toBe(90);
    expect(max.shockwaveRings).toBe(3);
  });
});
