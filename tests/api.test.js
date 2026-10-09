import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { questionRepo } from '../src/repositories/questionRepo.js';
import { sessionRepo } from '../src/repositories/sessionRepo.js';
import { config } from '../src/config.js';

describe('API v1 Gameplay & Sessions', () => {
  let app;

  beforeEach(() => {
    sessionRepo.clearAll();
    app = createApp();
  });

  it('GET /api/v1/health returns ok status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('verifies question bank loaded with valid questions and 4 options each', () => {
    const questions = questionRepo.getAll();
    expect(questions.length).toBeGreaterThanOrEqual(config.questionsPerGame);
    questions.forEach(q => {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
    });
  });

  it('POST /api/v1/sessions starts game session', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName: 'Editorial Tester' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body.totalQuestions).toBe(config.questionsPerGame);
    expect(res.body.questionOrder).toHaveLength(config.questionsPerGame);
  });

  it('SECURITY RULE: GET /api/v1/sessions/:id/question NEVER leaks correctIndex or explanation', async () => {
    const sessionRes = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName: 'Security Auditor' });

    const sessionId = sessionRes.body.sessionId;

    const qRes = await request(app).get(`/api/v1/sessions/${sessionId}/question`);
    expect(qRes.status).toBe(200);
    expect(qRes.body).toHaveProperty('question');
    expect(qRes.body.options).toHaveLength(4);

    // Strict security assertions
    expect(qRes.body).not.toHaveProperty('correctIndex');
    expect(qRes.body).not.toHaveProperty('explanation');
  });

  it('POST /api/v1/sessions/:id/answer evaluates right answer with paper_burst and wrong with bomb_blast', async () => {
    const sessionRes = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName: 'Effect Validator' });
    const sessionId = sessionRes.body.sessionId;

    const session = sessionRepo.getById(sessionId);
    const q1 = session.questionsSnapshot[0];

    // Submit correct answer
    const correctRes = await request(app)
      .post(`/api/v1/sessions/${sessionId}/answer`)
      .send({ questionId: q1.id, selectedIndex: q1.correctIndex });

    expect(correctRes.status).toBe(200);
    expect(correctRes.body.correct).toBe(true);
    expect(correctRes.body.pointsAwarded).toBeGreaterThan(0);
    expect(correctRes.body.streak).toBe(1);
    expect(correctRes.body.effect.type).toBe('paper_burst');
    expect(correctRes.body.effect.sound).toBe('paper_pop');
    expect(correctRes.body.explanation).toBe(q1.explanation);

    // Get question 2
    const q2 = session.questionsSnapshot[1];
    const wrongIndex = (q2.correctIndex + 1) % 4;

    // Submit wrong answer
    const wrongRes = await request(app)
      .post(`/api/v1/sessions/${sessionId}/answer`)
      .send({ questionId: q2.id, selectedIndex: wrongIndex });

    expect(wrongRes.status).toBe(200);
    expect(wrongRes.body.correct).toBe(false);
    expect(wrongRes.body.pointsAwarded).toBe(0);
    expect(wrongRes.body.streak).toBe(0); // streak reset
    expect(wrongRes.body.effect.type).toBe('bomb_blast');
    expect(wrongRes.body.effect.sound).toBe('bomb_boom');
    expect(wrongRes.body.explanation).toBe(q2.explanation);
  });

  it('rejects duplicate answer on same question with 409', async () => {
    const sessionRes = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName: 'Duplicate Tester' });
    const sessionId = sessionRes.body.sessionId;
    const session = sessionRepo.getById(sessionId);
    const q1 = session.questionsSnapshot[0];

    await request(app)
      .post(`/api/v1/sessions/${sessionId}/answer`)
      .send({ questionId: q1.id, selectedIndex: q1.correctIndex });

    // Repeat answer
    const dupRes = await request(app)
      .post(`/api/v1/sessions/${sessionId}/answer`)
      .send({ questionId: q1.id, selectedIndex: q1.correctIndex });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('ALREADY_ANSWERED');
  });

  it('rejects out-of-order question answer with 400', async () => {
    const sessionRes = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName: 'Order Tester' });
    const sessionId = sessionRes.body.sessionId;

    const session = sessionRepo.getById(sessionId);
    const q2 = session.questionsSnapshot[1]; // skipped question 1!

    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/answer`)
      .send({ questionId: q2.id, selectedIndex: q2.correctIndex });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OUT_OF_ORDER_ANSWER');
  });

  it('locks summary until finished and unlocks upon completion', async () => {
    const sessionRes = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName: 'Summary Tester' });
    const sessionId = sessionRes.body.sessionId;

    // Summary requested before finishing
    const earlySummary = await request(app).get(`/api/v1/sessions/${sessionId}/summary`);
    expect(earlySummary.status).toBe(400);
    expect(earlySummary.body.error.code).toBe('SESSION_NOT_FINISHED');

    // Fast-forward session to finished
    const session = sessionRepo.getById(sessionId);
    session.currentIndex = session.totalQuestions;
    session.status = 'finished';
    session.finishedAt = new Date().toISOString();
    session.answers = session.questionsSnapshot.map(q => ({
      questionId: q.id,
      category: q.category,
      selectedIndex: q.correctIndex,
      correctIndex: q.correctIndex,
      correct: true,
      timedOut: false,
      pointsAwarded: 150,
      elapsedSec: 2
    }));
    sessionRepo.save(session);

    // Summary requested after finishing
    const finalSummary = await request(app).get(`/api/v1/sessions/${sessionId}/summary`);
    expect(finalSummary.status).toBe(200);
    expect(finalSummary.body).toHaveProperty('accuracy');
    expect(finalSummary.body).toHaveProperty('categoryBreakdown');
    expect(finalSummary.body).toHaveProperty('missedQuestions');
  });

  it('GET /api/v1/sectors returns all 5 knowledge sectors with question breakdowns and generate URLs', async () => {
    const res = await request(app).get('/api/v1/sectors');
    expect(res.status).toBe(200);
    expect(res.body.totalSectors).toBe(5);
    expect(res.body.availableSectors).toEqual(['CA', 'Healthcare', 'Programming', 'Agriculture', 'Biology']);
    expect(res.body.sectors).toHaveLength(5);
    expect(res.body.sectors[0]).toHaveProperty('id');
    expect(res.body.sectors[0]).toHaveProperty('description');
    expect(res.body.sectors[0]).toHaveProperty('questionCount');
    expect(res.body.sectors[0]).toHaveProperty('apiGenerateUrl');
  });

  it('GET /api/v1/questions/practice returns masked question without answer fields', async () => {
    const res = await request(app)
      .get('/api/v1/questions/practice?category=Biology&difficulty=easy');

    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Biology');
    expect(res.body.options).toHaveLength(4);
    // Ensure security: no answer leak
    expect(res.body).not.toHaveProperty('correctIndex');
    expect(res.body).not.toHaveProperty('explanation');
  });

  it('POST /api/v1/questions/practice/verify evaluates answers with effect directives', async () => {
    const sample = questionRepo.getAll()[0];

    // Correct answer verification
    const correctRes = await request(app)
      .post('/api/v1/questions/practice/verify')
      .send({ questionId: sample.id, selectedIndex: sample.correctIndex });

    expect(correctRes.status).toBe(200);
    expect(correctRes.body.correct).toBe(true);
    expect(correctRes.body.effect.type).toBe('paper_burst');
    expect(correctRes.body.explanation).toBe(sample.explanation);

    // Wrong answer verification
    const wrongRes = await request(app)
      .post('/api/v1/questions/practice/verify')
      .send({ questionId: sample.id, selectedIndex: (sample.correctIndex + 1) % 4 });

    expect(wrongRes.status).toBe(200);
    expect(wrongRes.body.correct).toBe(false);
    expect(wrongRes.body.effect.type).toBe('bomb_blast');
  });

  it('POST /api/v1/sessions allows sector-specific and custom question count games', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName: 'Sector Explorer', category: 'CA', count: 5 });

    expect(res.status).toBe(201);
    expect(res.body.totalQuestions).toBe(5);
    expect(res.body.questionOrder).toHaveLength(5);

    const session = sessionRepo.getById(res.body.sessionId);
    session.questionsSnapshot.forEach(q => {
      expect(q.category).toBe('CA');
    });
  });

  it('Dynamic Question Refresh: repeated games for the same player serve fresh un-seen questions', async () => {
    const playerName = 'Returning Champion';

    // Game 1: 5 questions
    const g1Res = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName, count: 5 });
    expect(g1Res.status).toBe(201);
    const g1Questions = new Set(g1Res.body.questionOrder);

    // Game 2: 5 questions - must serve fresh un-seen questions!
    const g2Res = await request(app)
      .post('/api/v1/sessions')
      .send({ playerName, count: 5 });
    expect(g2Res.status).toBe(201);
    const g2Questions = g2Res.body.questionOrder;

    // Verify ZERO overlap between Game 1 and Game 2
    g2Questions.forEach(id => {
      expect(g1Questions.has(id)).toBe(false);
    });

    // Check player history endpoint
    const historyRes = await request(app)
      .get(`/api/v1/sessions/history?playerName=${encodeURIComponent(playerName)}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.seenCount).toBe(10);

    // Reset player history
    const resetRes = await request(app)
      .post('/api/v1/sessions/reset-history')
      .send({ playerName });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.seenCount).toBe(0);
  });

  it('Sector Question Generation APIs: dynamically generate fresh questions on-demand for any sector', async () => {
    // 1. Generate for Healthcare
    const healthRes = await request(app)
      .get('/api/v1/sectors/Healthcare/generate?count=3&difficulty=medium');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.sector).toBe('Healthcare');
    expect(healthRes.body.count).toBe(3);
    expect(healthRes.body.questions).toHaveLength(3);
    healthRes.body.questions.forEach(q => {
      expect(q.category).toBe('Healthcare');
      expect(q.options).toHaveLength(4);
      expect(q).toHaveProperty('correctIndex');
    });

    // 2. Generate for Agriculture via POST /questions/generate
    const agriRes = await request(app)
      .post('/api/v1/questions/generate')
      .send({ sector: 'Agriculture', count: 4 });
    expect(agriRes.status).toBe(201);
    expect(agriRes.body.sector).toBe('Agriculture');
    expect(agriRes.body.count).toBe(4);

    // 3. Bulk generate across all 5 sectors via POST /sectors/generate-all
    const allRes = await request(app)
      .post('/api/v1/sectors/generate-all')
      .send({ countPerSector: 2 });
    expect(allRes.status).toBe(201);
    expect(allRes.body.totalGenerated).toBe(10); // 5 sectors * 2
    expect(allRes.body.sectors).toEqual(['CA', 'Healthcare', 'Programming', 'Agriculture', 'Biology']);
  });
});
