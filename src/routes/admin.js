import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { adminController } from '../controllers/adminController.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validateBody } from '../middleware/validate.js';
import { createQuestionSchema, updateQuestionSchema } from '../schemas/question.js';

const router = Router();

// Admin Rate Limit: 30 requests per minute
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Admin rate limit exceeded. Max 30 requests per minute.'
      }
    });
  }
});

router.use(adminLimiter);
router.use(adminAuth);

// Question Management Endpoints
router.get('/questions', adminController.listQuestions);
router.get('/questions/export', adminController.exportBank);
router.post('/questions/import', adminController.importBank);
router.post('/questions/bulk', adminController.bulkAdd);
router.get('/questions/:id', adminController.getQuestion);
router.post('/questions', validateBody(createQuestionSchema), adminController.addQuestion);
router.put('/questions/:id', validateBody(updateQuestionSchema), adminController.updateQuestion);
router.patch('/questions/:id', adminController.patchQuestion);
router.delete('/questions/:id', adminController.deleteQuestion);
router.post('/questions/:id/restore', adminController.restoreQuestion);
router.get('/stats', adminController.getStats);

export default router;
