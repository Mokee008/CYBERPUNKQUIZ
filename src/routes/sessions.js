import { Router } from 'express';
import { sessionController } from '../controllers/sessionController.js';
import { validateBody } from '../middleware/validate.js';
import { startSessionSchema, submitAnswerSchema } from '../schemas/session.js';

const router = Router();

// POST /sessions
router.post('/', validateBody(startSessionSchema), sessionController.start);

// GET /sessions/history?playerName=Name
router.get('/history', sessionController.getHistory);

// POST /sessions/reset-history
router.post('/reset-history', sessionController.resetHistory);

// GET /sessions/:id/question
router.get('/:id/question', sessionController.getCurrentQuestion);

// POST /sessions/:id/answer
router.post('/:id/answer', validateBody(submitAnswerSchema), sessionController.submitAnswer);

// GET /sessions/:id
router.get('/:id', sessionController.getState);

// GET /sessions/:id/summary
router.get('/:id/summary', sessionController.getSummary);

// Optional SSE: GET /sessions/:id/events
router.get('/:id/events', sessionController.streamEvents);

export default router;
