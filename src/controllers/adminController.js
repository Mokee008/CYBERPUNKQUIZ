import { questionService } from '../services/questionService.js';

export const adminController = {
  listQuestions(req, res, next) {
    try {
      const filters = {
        category: req.query.category,
        difficulty: req.query.difficulty,
        active: req.query.active,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      };
      const result = questionService.getAll(filters);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  getQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const question = questionService.getById(id);
      if (!question) {
        return res.status(404).json({
          error: {
            code: 'QUESTION_NOT_FOUND',
            message: `Question id ${id} not found`
          }
        });
      }
      res.status(200).json(question);
    } catch (err) {
      next(err);
    }
  },

  async addQuestion(req, res, next) {
    try {
      const clientIp = req.ip || req.connection.remoteAddress;
      const question = await questionService.addQuestion(req.body, clientIp);
      res.status(201).json(question);
    } catch (err) {
      next(err);
    }
  },

  async updateQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const clientIp = req.ip || req.connection.remoteAddress;
      const updated = await questionService.updateQuestion(id, req.body, clientIp);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },

  async patchQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const clientIp = req.ip || req.connection.remoteAddress;
      const force = req.query.force === 'true';
      const patched = await questionService.patchQuestion(id, { ...req.body, force }, clientIp);
      res.status(200).json(patched);
    } catch (err) {
      next(err);
    }
  },

  async deleteQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const hard = req.query.hard === 'true';
      const force = req.query.force === 'true';
      const clientIp = req.ip || req.connection.remoteAddress;

      const result = await questionService.deleteQuestion(id, { hard, force }, clientIp);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async restoreQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const clientIp = req.ip || req.connection.remoteAddress;
      const restored = await questionService.restoreQuestion(id, clientIp);
      res.status(200).json(restored);
    } catch (err) {
      next(err);
    }
  },

  async bulkAdd(req, res, next) {
    try {
      const clientIp = req.ip || req.connection.remoteAddress;
      const questions = await questionService.bulkAdd(req.body, clientIp);
      res.status(201).json({ added: questions.length, questions });
    } catch (err) {
      next(err);
    }
  },

  exportBank(req, res, next) {
    try {
      const result = questionService.getAll();
      res.setHeader('Content-Disposition', 'attachment; filename="questions-export.json"');
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(result.questions);
    } catch (err) {
      next(err);
    }
  },

  async importBank(req, res, next) {
    try {
      const mode = req.body.mode || 'append';
      const confirm = req.query.confirm === 'true';
      const questions = req.body.questions;
      const clientIp = req.ip || req.connection.remoteAddress;

      const result = await questionService.importBank({ mode, questions, confirm }, clientIp);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  getStats(req, res, next) {
    try {
      const stats = questionService.getStats();
      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  }
};
