import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { questionRepo } from '../src/repositories/questionRepo.js';
import { sessionRepo } from '../src/repositories/sessionRepo.js';
import { config } from '../src/config.js';

const ADMIN_KEY = config.adminApiKey || 'atelier-secret-admin-key';

describe('Admin Question Management & Safety', () => {
  let app;
  let originalQuestions;

  beforeEach(() => {
    sessionRepo.clearAll();
    // Cache original questions to restore after each test
    originalQuestions = JSON.parse(JSON.stringify(questionRepo.getAll()));
    app = createApp();
  });

  afterEach(async () => {
    // Restore question bank to original state
    await questionRepo.save(originalQuestions);
  });

  it('rejects access without valid x-admin-key with 401', async () => {
    const res = await request(app).get('/api/v1/admin/questions');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');

    const wrongRes = await request(app)
      .get('/api/v1/admin/questions')
      .set('x-admin-key', 'wrong-key-secret');
    expect(wrongRes.status).toBe(401);
  });

  it('GET /api/v1/admin/questions returns all questions including answers', async () => {
    const res = await request(app)
      .get('/api/v1/admin/questions')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('questions');
    expect(res.body.questions.length).toBeGreaterThanOrEqual(30);
    expect(res.body.questions[0]).toHaveProperty('correctIndex');
    expect(res.body.questions[0]).toHaveProperty('explanation');
  });

  it('POST /api/v1/admin/questions creates question with auto-assigned id', async () => {
    const payload = {
      category: 'Programming',
      difficulty: 'easy',
      question: 'Which element is used to represent an independent self-contained article?',
      options: ['<article>', '<section>', '<aside>', '<nav>'],
      correctIndex: 0,
      explanation: 'The <article> element represents a self-contained composition in a document.',
      active: true
    };

    const res = await request(app)
      .post('/api/v1/admin/questions')
      .set('x-admin-key', ADMIN_KEY)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.id).toBeGreaterThan(30); // max id + 1
    expect(res.body.question).toBe(payload.question);
  });

  it('rejects invalid question payloads (bad category, 3 options, out of range correctIndex, duplicate options)', async () => {
    // Bad category
    const badCat = await request(app)
      .post('/api/v1/admin/questions')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        category: 'PYTHON', // invalid
        difficulty: 'easy',
        question: 'Is this a valid category for web dev quiz?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        explanation: 'Testing invalid category.'
      });
    expect(badCat.status).toBe(400);

    // 3 options instead of 4
    const badOpts = await request(app)
      .post('/api/v1/admin/questions')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        category: 'Programming',
        difficulty: 'easy',
        question: 'Only three options provided here?',
        options: ['One', 'Two', 'Three'],
        correctIndex: 0,
        explanation: 'Testing options count.'
      });
    expect(badOpts.status).toBe(400);

    // Duplicate options
    const dupOpts = await request(app)
      .post('/api/v1/admin/questions')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        category: 'HTML',
        difficulty: 'easy',
        question: 'Duplicate options in array?',
        options: ['Same', 'Same', 'Other', 'Another'],
        correctIndex: 0,
        explanation: 'Testing duplicate options.'
      });
    expect(dupOpts.status).toBe(400);

    // Out-of-range correctIndex
    const badIndex = await request(app)
      .post('/api/v1/admin/questions')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        category: 'HTML',
        difficulty: 'easy',
        question: 'Out of range correctIndex test?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 4,
        explanation: 'Testing out of bounds index.'
      });
    expect(badIndex.status).toBe(400);
  });

  it('blocks deleting or deactivating when active count falls below QUESTIONS_PER_GAME unless ?force=true', async () => {
    // Set bank to exactly QUESTIONS_PER_GAME active questions to test minimum threshold
    const trimmed = originalQuestions.slice(0, config.questionsPerGame);
    await questionRepo.save(trimmed);

    // Deleting one question without force must fail with 409
    const res = await request(app)
      .delete(`/api/v1/admin/questions/${trimmed[0].id}`)
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MINIMUM_ACTIVE_QUESTIONS_REQUIRED');

    // With ?force=true, it is permitted
    const forceRes = await request(app)
      .delete(`/api/v1/admin/questions/${trimmed[0].id}?force=true`)
      .set('x-admin-key', ADMIN_KEY);

    expect(forceRes.status).toBe(200);
    expect(forceRes.body.question.active).toBe(false);

    // Restoring brings it back
    const restoreRes = await request(app)
      .post(`/api/v1/admin/questions/${trimmed[0].id}/restore`)
      .set('x-admin-key', ADMIN_KEY);

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.active).toBe(true);
  });

  it('running sessions keep frozen snapshot unaffected by subsequent question edits or deletes', async () => {
    // 1. Start a game session
    const sessionRes = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName: 'Snapshot Test Player' });
    const sessionId = sessionRes.body.sessionId;

    const sessionBefore = sessionRepo.getById(sessionId);
    const firstQ = sessionBefore.questionsSnapshot[0];
    const originalText = firstQ.question;

    // 2. Admin edits that question in the bank
    await request(app)
      .patch(`/api/v1/admin/questions/${firstQ.id}`)
      .set('x-admin-key', ADMIN_KEY)
      .send({ question: 'MUTATED QUESTION TEXT BY ADMIN' });

    // 3. Query the question from the ongoing session: MUST REMAIN ORIGINAL!
    const qRes = await request(app).get(`/api/v1/sessions/${sessionId}/question`);
    expect(qRes.body.question).toBe(originalText);
    expect(qRes.body.question).not.toBe('MUTATED QUESTION TEXT BY ADMIN');
  });

  it('creates backup and appends audit log entry on question modification', async () => {
    const payload = {
      category: 'CSS',
      difficulty: 'easy',
      question: 'Audit trail test: which property clears floats?',
      options: ['clear', 'float', 'clean', 'overflow'],
      correctIndex: 0,
      explanation: 'The clear property specifies whether an element can be next to floating elements.',
      active: true
    };

    await request(app)
      .post('/api/v1/admin/questions')
      .set('x-admin-key', ADMIN_KEY)
      .send(payload);

    // Verify backup exists in data/backups/
    const backupDir = path.resolve(process.cwd(), 'data/backups');
    const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('questions-'));
    expect(backups.length).toBeGreaterThan(0);

    // Verify audit log entry
    const auditFile = path.resolve(process.cwd(), 'data/audit.log');
    expect(fs.existsSync(auditFile)).toBe(true);
    const auditContent = fs.readFileSync(auditFile, 'utf-8');
    expect(auditContent).toContain('ADD_QUESTION');
  });

  it('GET /api/v1/admin/stats returns category, difficulty, distribution and warnings', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('byCategory');
    expect(res.body).toHaveProperty('correctDist');
    expect(res.body).toHaveProperty('warnings');
    expect(Array.isArray(res.body.warnings)).toBe(true);
  });
});
