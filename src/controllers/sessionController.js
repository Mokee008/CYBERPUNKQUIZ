import { quizService } from '../services/quizService.js';

// Connected SSE clients by sessionId
const sseClients = new Map();

export const sessionController = {
  start(req, res, next) {
    try {
      const { playerName, category, difficulty, count } = req.body;
      const result = quizService.createSession(playerName, { category, difficulty, count });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  getCurrentQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const question = quizService.getCurrentQuestion(id);

      // Emit SSE question event if connected
      const client = sseClients.get(id);
      if (client) {
        client.write(`event: question\ndata: ${JSON.stringify(question)}\n\n`);
      }

      res.status(200).json(question);
    } catch (err) {
      next(err);
    }
  },

  submitAnswer(req, res, next) {
    try {
      const { id } = req.params;
      const { questionId, selectedIndex } = req.body;

      const result = quizService.submitAnswer(id, { questionId, selectedIndex });

      // Emit SSE result and finished event if connected
      const client = sseClients.get(id);
      if (client) {
        client.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`);
        if (result.finished) {
          client.write(`event: finished\ndata: ${JSON.stringify({ score: result.score, finished: true })}\n\n`);
        }
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  getState(req, res, next) {
    try {
      const { id } = req.params;
      const state = quizService.getSessionState(id);
      res.status(200).json(state);
    } catch (err) {
      next(err);
    }
  },

  getSummary(req, res, next) {
    try {
      const { id } = req.params;
      const summary = quizService.getSessionSummary(id);
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  },

  streamEvents(req, res, next) {
    try {
      const { id } = req.params;
      // Check session exists
      quizService.getSessionState(id);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      sseClients.set(id, res);

      res.write(`event: connected\ndata: ${JSON.stringify({ sessionId: id, status: 'connected' })}\n\n`);

      req.on('close', () => {
        sseClients.delete(id);
      });
    } catch (err) {
      next(err);
    }
  },

  getHistory(req, res, next) {
    try {
      const { playerName } = req.query;
      const history = quizService.getPlayerHistory(playerName);
      res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  },

  resetHistory(req, res, next) {
    try {
      const { playerName } = req.body || {};
      const result = quizService.resetPlayerHistory(playerName);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
};
