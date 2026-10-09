import { nanoid } from 'nanoid';
import { questionService } from './questionService.js';
import { scoringService } from './scoringService.js';
import { buildEffect } from './effects.js';
import { sessionRepo } from '../repositories/sessionRepo.js';
import { leaderboardRepo } from '../repositories/leaderboardRepo.js';
import { config } from '../config.js';

// In-memory player question history for fresh non-repetitive gameplay
const playerSeenQuestions = new Map();

export const quizService = {
  createSession(playerName, options = {}) {
    const trimmedName = (playerName || 'Player').trim();
    const playerKey = trimmedName.toLowerCase();
    const seenSet = playerSeenQuestions.get(playerKey) || new Set();

    // 1. Select balanced, randomized game deck from question bank prioritizing unseen questions
    const deck = questionService.selectGameDeck({
      category: options.category,
      difficulty: options.difficulty,
      count: options.count,
      excludeIds: Array.from(seenSet)
    });

    // Record seen questions for this player
    deck.forEach(q => seenSet.add(q.id));
    playerSeenQuestions.set(playerKey, seenSet);

    const sessionId = nanoid(16);
    const session = {
      id: sessionId,
      playerName: trimmedName,
      questionsSnapshot: deck, // Frozen snapshot of questions
      questionOrder: deck.map(q => q.id),
      currentIndex: 0,
      totalQuestions: deck.length,
      score: 0,
      streak: 0,
      bestStreak: 0,
      answers: [], // History of submitted answers
      status: 'in_progress', // 'in_progress' | 'finished'
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      currentQuestionIssuedAt: null,
      finishedAt: null
    };

    sessionRepo.save(session);

    return {
      sessionId,
      totalQuestions: session.totalQuestions,
      questionOrder: session.questionOrder
    };
  },

  getCurrentQuestion(sessionId) {
    const session = sessionRepo.getById(sessionId);
    if (!session) {
      const err = new Error(`Session ${sessionId} not found`);
      err.statusCode = 404;
      err.code = 'SESSION_NOT_FOUND';
      throw err;
    }

    if (session.status === 'finished') {
      const err = new Error('Session is already finished');
      err.statusCode = 400;
      err.code = 'SESSION_FINISHED';
      throw err;
    }

    const currentQ = session.questionsSnapshot[session.currentIndex];
    if (!currentQ) {
      const err = new Error('No more questions available');
      err.statusCode = 400;
      err.code = 'NO_QUESTIONS_REMAINING';
      throw err;
    }

    // Set question issue timestamp on first retrieval
    if (!session.currentQuestionIssuedAt) {
      session.currentQuestionIssuedAt = Date.now();
      session.lastActivityAt = new Date().toISOString();
      sessionRepo.save(session);
    }

    // SECURITY RULE: Mask correctIndex and explanation!
    return {
      number: session.currentIndex + 1,
      total: session.totalQuestions,
      id: currentQ.id,
      category: currentQ.category,
      difficulty: currentQ.difficulty,
      question: currentQ.question,
      options: currentQ.options,
      timeLimitSec: config.timeLimitSec
    };
  },

  submitAnswer(sessionId, { questionId, selectedIndex }) {
    const session = sessionRepo.getById(sessionId);
    if (!session) {
      const err = new Error(`Session ${sessionId} not found`);
      err.statusCode = 404;
      err.code = 'SESSION_NOT_FOUND';
      throw err;
    }

    if (session.status === 'finished') {
      const err = new Error('Session is already finished');
      err.statusCode = 400;
      err.code = 'SESSION_FINISHED';
      throw err;
    }

    const currentQ = session.questionsSnapshot[session.currentIndex];
    if (!currentQ) {
      const err = new Error('No active question in session');
      err.statusCode = 400;
      err.code = 'NO_ACTIVE_QUESTION';
      throw err;
    }

    // Rule: Cannot answer same question twice
    const alreadyAnswered = session.answers.some(a => a.questionId === questionId);
    if (alreadyAnswered) {
      const err = new Error(`Question id ${questionId} has already been answered`);
      err.statusCode = 409;
      err.code = 'ALREADY_ANSWERED';
      throw err;
    }

    // Rule: Must be answered in the issued order
    if (currentQ.id !== questionId) {
      const err = new Error(`Answer submitted out of order. Expected question id ${currentQ.id}, received ${questionId}`);
      err.statusCode = 400;
      err.code = 'OUT_OF_ORDER_ANSWER';
      throw err;
    }

    // Calculate elapsed time and verify server-enforced timeout
    const issuedAt = session.currentQuestionIssuedAt || Date.now();
    const elapsedSec = (Date.now() - issuedAt) / 1000;
    const timedOut = elapsedSec > config.timeLimitSec;

    const isCorrect = !timedOut && selectedIndex === currentQ.correctIndex;

    // Update streak and bestStreak
    let currentStreak = session.streak;
    if (isCorrect) {
      currentStreak += 1;
      if (currentStreak > session.bestStreak) {
        session.bestStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
    session.streak = currentStreak;

    // Calculate points
    const pointsAwarded = scoringService.calculatePoints({
      correct: isCorrect,
      difficulty: currentQ.difficulty,
      elapsedSec,
      streak: session.streak,
      timedOut
    });

    session.score += pointsAwarded;

    // Record answer
    session.answers.push({
      questionId: currentQ.id,
      category: currentQ.category,
      selectedIndex,
      correctIndex: currentQ.correctIndex,
      correct: isCorrect,
      timedOut,
      pointsAwarded,
      elapsedSec: Math.round(elapsedSec * 10) / 10
    });

    // Advance session index
    session.currentIndex += 1;
    session.lastActivityAt = new Date().toISOString();

    const isFinished = session.currentIndex >= session.totalQuestions;
    if (isFinished) {
      session.status = 'finished';
      session.finishedAt = new Date().toISOString();
      session.currentQuestionIssuedAt = null;

      // Record in leaderboard
      const totalElapsedSec = Math.round((new Date(session.finishedAt) - new Date(session.startedAt)) / 1000);
      const accuracy = session.answers.length > 0
        ? Math.round((session.answers.filter(a => a.correct).length / session.answers.length) * 100)
        : 0;

      leaderboardRepo.record({
        playerName: session.playerName,
        score: session.score,
        accuracy,
        bestStreak: session.bestStreak,
        durationSec: totalElapsedSec,
        finishedAt: session.finishedAt
      });
    } else {
      // Prime timestamp for next question
      session.currentQuestionIssuedAt = Date.now();
    }

    sessionRepo.save(session);

    // Build effect directive
    const effect = buildEffect({
      correct: isCorrect,
      streak: session.streak,
      difficulty: currentQ.difficulty,
      timedOut,
      correctIndex: currentQ.correctIndex
    });

    return {
      correct: isCorrect,
      correctIndex: currentQ.correctIndex,
      explanation: currentQ.explanation,
      pointsAwarded,
      score: session.score,
      streak: session.streak,
      bestStreak: session.bestStreak,
      timedOut,
      finished: isFinished,
      effect
    };
  },

  getSessionState(sessionId) {
    const session = sessionRepo.getById(sessionId);
    if (!session) {
      const err = new Error(`Session ${sessionId} not found`);
      err.statusCode = 404;
      err.code = 'SESSION_NOT_FOUND';
      throw err;
    }

    const answered = session.answers.length;
    const correctCount = session.answers.filter(a => a.correct).length;
    const accuracy = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;

    return {
      sessionId: session.id,
      playerName: session.playerName,
      score: session.score,
      streak: session.streak,
      bestStreak: session.bestStreak,
      answered,
      totalQuestions: session.totalQuestions,
      accuracy,
      status: session.status
    };
  },

  getSessionSummary(sessionId) {
    const session = sessionRepo.getById(sessionId);
    if (!session) {
      const err = new Error(`Session ${sessionId} not found`);
      err.statusCode = 404;
      err.code = 'SESSION_NOT_FOUND';
      throw err;
    }

    if (session.status !== 'finished') {
      const err = new Error('Summary is only available after completing all questions');
      err.statusCode = 400;
      err.code = 'SESSION_NOT_FINISHED';
      throw err;
    }

    const totalAnswered = session.answers.length;
    const correctCount = session.answers.filter(a => a.correct).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    // Category breakdown
    const categoryBreakdown = {};
    config.categories.forEach(c => {
      categoryBreakdown[c] = { total: 0, correct: 0, accuracy: 0 };
    });

    session.answers.forEach(a => {
      if (!categoryBreakdown[a.category]) {
        categoryBreakdown[a.category] = { total: 0, correct: 0, accuracy: 0 };
      }
      categoryBreakdown[a.category].total++;
      if (a.correct) categoryBreakdown[a.category].correct++;
    });

    let weakestCategory = null;
    let lowestPct = 101;

    Object.entries(categoryBreakdown).forEach(([cat, stats]) => {
      stats.accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      if (stats.total > 0 && stats.accuracy < lowestPct) {
        lowestPct = stats.accuracy;
        weakestCategory = cat;
      }
    });

    // List of missed questions with correct answers
    const missedQuestions = session.answers
      .filter(a => !a.correct)
      .map(a => {
        const q = session.questionsSnapshot.find(item => item.id === a.questionId);
        return {
          questionId: a.questionId,
          category: a.category,
          question: q ? q.question : 'Unknown',
          selectedAnswer: q && a.selectedIndex !== null ? q.options[a.selectedIndex] : null,
          correctAnswer: q ? q.options[q.correctIndex] : 'Unknown',
          explanation: q ? q.explanation : '',
          timedOut: a.timedOut
        };
      });

    const totalDurationSec = Math.round((new Date(session.finishedAt) - new Date(session.startedAt)) / 1000);

    return {
      sessionId: session.id,
      playerName: session.playerName,
      score: session.score,
      accuracy,
      bestStreak: session.bestStreak,
      totalDurationSec,
      weakestCategory,
      categoryBreakdown,
      missedQuestions
    };
  },

  verifyPracticeAnswer({ questionId, selectedIndex }) {
    const q = questionService.getById(questionId);
    if (!q || !q.active) {
      const err = new Error(`Question ${questionId} not found or inactive`);
      err.statusCode = 404;
      err.code = 'QUESTION_NOT_FOUND';
      throw err;
    }

    const correct = (q.correctIndex === selectedIndex);
    const effect = buildEffect({
      correct,
      streak: correct ? 1 : 0,
      difficulty: q.difficulty,
      timedOut: false,
      correctIndex: q.correctIndex
    });

    return {
      questionId: q.id,
      category: q.category,
      difficulty: q.difficulty,
      correct,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      effect
    };
  },

  getPlayerHistory(playerName) {
    const key = (playerName || '').trim().toLowerCase();
    const seen = playerSeenQuestions.get(key) || new Set();
    return {
      playerName,
      seenCount: seen.size,
      seenQuestionIds: Array.from(seen)
    };
  },

  resetPlayerHistory(playerName) {
    if (playerName) {
      const key = playerName.trim().toLowerCase();
      playerSeenQuestions.delete(key);
      return { playerName, reset: true, seenCount: 0 };
    }
    playerSeenQuestions.clear();
    return { resetAll: true, seenCount: 0 };
  }
};
