import { config } from '../config.js';

export const scoringService = {
  getMultiplier(streak) {
    if (streak >= 8) return 1.5;
    if (streak >= 5) return 1.25;
    if (streak >= 3) return 1.1;
    return 1.0;
  },

  calculatePoints({ correct, difficulty = 'easy', elapsedSec = 0, streak = 0, timedOut = false }) {
    if (!correct || timedOut) {
      return 0;
    }

    const baseScores = {
      easy: 100,
      medium: 150,
      hard: 200
    };
    const base = baseScores[difficulty] ?? 100;

    // Linear speed bonus up to 50 points over timeLimitSec (default 20s)
    const timeLimit = config.timeLimitSec || 20;
    const clampedElapsed = Math.min(Math.max(elapsedSec, 0), timeLimit);
    const remainingRatio = Math.max(0, (timeLimit - clampedElapsed) / timeLimit);
    const speedBonus = Math.round(remainingRatio * 50);

    const multiplier = this.getMultiplier(streak);
    const points = Math.round((base + speedBonus) * multiplier);

    return points;
  }
};
