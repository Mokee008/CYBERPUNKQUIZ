const CORRECT_LABELS = [
  'Nailed it',
  'Spot on',
  'Flawless',
  'Sharp mind',
  'Exquisite',
  'Masterful',
  'On point',
  'Brilliant'
];

let labelRotationIndex = 0;

/**
 * Pure generator for frontend effect directives.
 * Driven by streak, difficulty, timeout, and correctness.
 */
export function buildEffect({
  correct = false,
  streak = 0,
  difficulty = 'easy',
  timedOut = false,
  correctIndex = 0
}) {
  // 1. Calculate Intensity (1 - 5)
  let intensity = 1;
  const diffWeights = { easy: 1, medium: 2, hard: 3 };
  const baseWeight = diffWeights[difficulty] || 1;

  if (correct) {
    intensity = baseWeight;
    if (streak >= 7) intensity += 2;
    else if (streak >= 3) intensity += 1;
  } else {
    // Wrong / Timeout intensity scales higher if player dropped a high streak
    intensity = baseWeight + (timedOut ? 1 : 0);
    if (streak >= 5) intensity = 5;
    else if (streak >= 3) intensity = Math.max(intensity, 4);
  }
  intensity = Math.min(Math.max(intensity, 1), 5);

  const optionLetters = ['A', 'B', 'C', 'D'];
  const correctLetter = optionLetters[correctIndex] || 'A';

  if (correct) {
    const label = CORRECT_LABELS[labelRotationIndex % CORRECT_LABELS.length];
    labelRotationIndex++;

    // Particle count scales from 70 to 200 with intensity
    const particleCount = Math.round(70 + (intensity - 1) * 32.5);

    return {
      type: 'paper_burst',
      intensity,
      durationMs: 1600,
      particleCount,
      shapes: ['rect', 'strip', 'curl'],
      palette: ['#EADFC8', '#F5EEDF', '#BFAE8D', '#8A9A5B', '#C4512A'],
      spreadDeg: 360,
      originPct: { x: 50, y: 60 },
      gravity: 0.6,
      sound: 'paper_pop',
      label
    };
  }

  // Wrong or Timed Out -> bomb_blast
  const amplitudePx = Math.round(10 + (intensity - 1) * 4); // 10 to 26 px
  const debrisCount = Math.round(40 + (intensity - 1) * 12.5); // 40 to 90
  const shockwaveRings = intensity >= 3 ? 3 : 2;

  const label = timedOut
    ? `Expired. It was ${correctLetter}.`
    : `Boom. It was ${correctLetter}.`;

  return {
    type: 'bomb_blast',
    intensity,
    durationMs: 1800,
    phases: [
      { name: 'fuse', ms: 250 },
      { name: 'flash', ms: 120 },
      { name: 'shockwave', ms: 500 },
      { name: 'debris', ms: 900 },
      { name: 'smoke', ms: 1400 }
    ],
    screenShake: {
      amplitudePx,
      ms: 450
    },
    debrisCount,
    shockwaveRings,
    flashColor: '#F5EEDF',
    smokeColor: '#221F19',
    sound: 'bomb_boom',
    label
  };
}
