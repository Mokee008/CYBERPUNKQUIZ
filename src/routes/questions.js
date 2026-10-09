import { Router } from 'express';
import { questionService } from '../services/questionService.js';
import { quizService } from '../services/quizService.js';
import { validateBody } from '../middleware/validate.js';
import { practiceVerifySchema } from '../schemas/session.js';

const router = Router();

// GET /api/v1/questions/practice
// Fetches a single practice question with options, masking correct answers.
// Pass ?fresh=true to generate a brand new real-time question!
router.get('/practice', (req, res, next) => {
  try {
    const { category, difficulty, fresh = 'false' } = req.query;
    const isFresh = fresh === 'true' || fresh === true;
    const question = questionService.getPracticeQuestion({ category, difficulty, fresh: isFresh });
    res.status(200).json(question);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/questions/practice/verify
// Evaluates selected answer for a practice question and returns effect directive
router.post('/practice/verify', validateBody(practiceVerifySchema), (req, res, next) => {
  try {
    const result = quizService.verifyPracticeAnswer(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/questions/generate
// On-demand API endpoint to generate fresh questions across any sector (CA, Healthcare, Programming, Agriculture, Biology, all)
router.post('/generate', async (req, res, next) => {
  try {
    const { sector = 'Programming', count = 5, difficulty, persist = true } = req.body || {};
    const result = await questionService.generateQuestionsForSector({
      sector,
      count,
      difficulty,
      persist,
      ip: req.ip
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
