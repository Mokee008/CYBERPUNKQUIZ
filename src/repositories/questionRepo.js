import fs from 'node:fs';
import path from 'node:path';
import { validateQuestionBank } from '../utils/validateQuestions.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.log');

// Ensure data and backup directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// In-process mutex for single-writer locking
class Mutex {
  constructor() {
    this._queue = Promise.resolve();
  }

  lock() {
    let unlock;
    const next = new Promise((resolve) => {
      unlock = resolve;
    });
    const willLock = this._queue.then(() => unlock);
    this._queue = this._queue.then(() => next);
    return willLock;
  }
}

const writeMutex = new Mutex();

export const questionRepo = {
  getFilePath() {
    return QUESTIONS_FILE;
  },

  getAll() {
    if (!fs.existsSync(QUESTIONS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
  },

  async save(questions, auditInfo = null) {
    const unlock = await writeMutex.lock();
    try {
      // 1. Verify integrity before saving
      validateQuestionBank(questions);

      // 2. Create automatic backup of current file if it exists
      if (fs.existsSync(QUESTIONS_FILE)) {
        this._createBackup();
      }

      // 3. Atomic write: write to temp file then rename
      const tempFile = path.join(DATA_DIR, `questions.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`);
      fs.writeFileSync(tempFile, JSON.stringify(questions, null, 2), 'utf-8');
      fs.renameSync(tempFile, QUESTIONS_FILE);

      // 4. Record audit log
      if (auditInfo) {
        this._appendAuditLog(auditInfo);
      }

      return questions;
    } finally {
      unlock();
    }
  },

  _createBackup() {
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const backupPath = path.join(BACKUPS_DIR, `questions-${timestamp}.json`);

      fs.copyFileSync(QUESTIONS_FILE, backupPath);

      // Prune to keep only the latest 20 backups
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith('questions-') && f.endsWith('.json'))
        .sort(); // Lexicographical sort corresponds to chronological

      if (files.length > 20) {
        const toDelete = files.slice(0, files.length - 20);
        toDelete.forEach(f => {
          try {
            fs.unlinkSync(path.join(BACKUPS_DIR, f));
          } catch {}
        });
      }
    } catch (err) {
      console.warn('Backup creation warning:', err.message);
    }
  },

  _appendAuditLog(auditInfo) {
    try {
      const entry = {
        time: new Date().toISOString(),
        action: auditInfo.action,
        id: auditInfo.id ?? null,
        ip: auditInfo.ip ?? 'unknown',
        before: auditInfo.before ?? null,
        after: auditInfo.after ?? null
      };
      fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err) {
      console.warn('Audit log write warning:', err.message);
    }
  }
};
