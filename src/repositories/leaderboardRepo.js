import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

function loadLeaderboard() {
  if (fs.existsSync(LEADERBOARD_FILE)) {
    try {
      const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function saveLeaderboard(entries) {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Leaderboard save warning:', err.message);
  }
}

export const leaderboardRepo = {
  getAll() {
    return loadLeaderboard();
  },

  record({ playerName, score, accuracy, bestStreak, durationSec, finishedAt }) {
    const list = loadLeaderboard();
    const newEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      playerName,
      score,
      accuracy,
      bestStreak,
      durationSec,
      finishedAt: finishedAt || new Date().toISOString()
    };

    list.push(newEntry);

    // Sort by score DESC, then durationSec ASC
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.durationSec - b.durationSec;
    });

    // Keep top 10
    const top10 = list.slice(0, 10);
    saveLeaderboard(top10);
    return top10;
  },

  clearAll() {
    saveLeaderboard([]);
  }
};
