import { describe, it, expect } from 'vitest';
import { scoringService } from '../src/services/scoringService.js';

describe('Scoring Service', () => {
  it('awards base points on instant correct answer without streak (elapsed 0s)', () => {
    // Easy base 100 + speed 50 = 150
    const easyPts = scoringService.calculatePoints({
      correct: true,
      difficulty: 'easy',
      elapsedSec: 0,
      streak: 1
    });
    expect(easyPts).toBe(150);

    // Medium base 150 + speed 50 = 200
    const medPts = scoringService.calculatePoints({
      correct: true,
      difficulty: 'medium',
      elapsedSec: 0,
      streak: 1
    });
    expect(medPts).toBe(200);

    // Hard base 200 + speed 50 = 250
    const hardPts = scoringService.calculatePoints({
      correct: true,
      difficulty: 'hard',
      elapsedSec: 0,
      streak: 1
    });
    expect(hardPts).toBe(250);
  });

  it('calculates linear speed bonus properly across 20s window', () => {
    // At 10s (halfway): speed bonus = 25. Easy base 100 + 25 = 125
    const pts10s = scoringService.calculatePoints({
      correct: true,
      difficulty: 'easy',
      elapsedSec: 10,
      streak: 1
    });
    expect(pts10s).toBe(125);

    // At 20s (last second): speed bonus = 0. Easy base 100 + 0 = 100
    const pts20s = scoringService.calculatePoints({
      correct: true,
      difficulty: 'easy',
      elapsedSec: 20,
      streak: 1
    });
    expect(pts20s).toBe(100);
  });

  it('applies streak multipliers correctly (x1.0, x1.1 at 3, x1.25 at 5, x1.5 at 8+)', () => {
    // Base 100 + speed 0 = 100
    expect(scoringService.getMultiplier(0)).toBe(1.0);
    expect(scoringService.getMultiplier(2)).toBe(1.0);
    expect(scoringService.getMultiplier(3)).toBe(1.1);
    expect(scoringService.getMultiplier(4)).toBe(1.1);
    expect(scoringService.getMultiplier(5)).toBe(1.25);
    expect(scoringService.getMultiplier(7)).toBe(1.25);
    expect(scoringService.getMultiplier(8)).toBe(1.5);
    expect(scoringService.getMultiplier(15)).toBe(1.5);

    const ptsStreak3 = scoringService.calculatePoints({
      correct: true,
      difficulty: 'easy',
      elapsedSec: 20, // 0 speed bonus
      streak: 3
    });
    expect(ptsStreak3).toBe(110); // 100 * 1.1

    const ptsStreak5 = scoringService.calculatePoints({
      correct: true,
      difficulty: 'easy',
      elapsedSec: 20,
      streak: 5
    });
    expect(ptsStreak5).toBe(125); // 100 * 1.25

    const ptsStreak8 = scoringService.calculatePoints({
      correct: true,
      difficulty: 'easy',
      elapsedSec: 20,
      streak: 8
    });
    expect(ptsStreak8).toBe(150); // 100 * 1.5
  });

  it('awards 0 points on wrong answer or timeout', () => {
    const wrong = scoringService.calculatePoints({
      correct: false,
      difficulty: 'hard',
      elapsedSec: 2,
      streak: 10
    });
    expect(wrong).toBe(0);

    const timedOut = scoringService.calculatePoints({
      correct: true,
      difficulty: 'hard',
      elapsedSec: 25,
      streak: 10,
      timedOut: true
    });
    expect(timedOut).toBe(0);
  });
});
