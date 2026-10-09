import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// In-memory cache for fast game engine lookups + JSON file persistence
let sessionsCache = new Map();

function loadSessions() {
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const list = JSON.parse(raw);
      sessionsCache = new Map(list.map(s => [s.id, s]));
    } catch {
      sessionsCache = new Map();
    }
  }
}

function persistSessions() {
  try {
    const list = Array.from(sessionsCache.values());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Session persist warning:', err.message);
  }
}

loadSessions();

export const sessionRepo = {
  getById(id) {
    return sessionsCache.get(id) || null;
  },

  save(session) {
    sessionsCache.set(session.id, session);
    persistSessions();
    return session;
  },

  delete(id) {
    const deleted = sessionsCache.delete(id);
    if (deleted) persistSessions();
    return deleted;
  },

  cleanExpired(ttlMinutes = 60) {
    const now = Date.now();
    const ttlMs = ttlMinutes * 60 * 1000;
    let modified = false;

    for (const [id, s] of sessionsCache.entries()) {
      const lastActive = new Date(s.lastActivityAt || s.startedAt).getTime();
      if (now - lastActive > ttlMs) {
        sessionsCache.delete(id);
        modified = true;
      }
    }

    if (modified) persistSessions();
  },

  // Reset helper for tests
  clearAll() {
    sessionsCache.clear();
    persistSessions();
  }
};
