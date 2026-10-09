import { Router } from 'express';
import { questionService } from '../services/questionService.js';
import { config } from '../config.js';

const router = Router();

// GET /api/v1/sectors
// Returns catalog of all 5 sectors with question counts, difficulty breakdowns, and direct generate URLs
router.get('/', (req, res, next) => {
  try {
    const sectors = questionService.getSectorsSummary();
    res.status(200).json({
      totalSectors: sectors.length,
      availableSectors: config.categories,
      sectors
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sectors/:sector/generate
// Generates fresh new questions for the specific sector (CA, Healthcare, Programming, Agriculture, Biology)
router.get('/:sector/generate', async (req, res, next) => {
  try {
    const { sector } = req.params;
    const { count = 5, difficulty, persist = 'true' } = req.query;
    const shouldPersist = persist === 'true' || persist === true;

    const result = await questionService.generateQuestionsForSector({
      sector,
      count,
      difficulty,
      persist: shouldPersist,
      ip: req.ip
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/sectors/:sector/generate
// POST variant to generate fresh questions for a specific sector with payload options
router.post('/:sector/generate', async (req, res, next) => {
  try {
    const { sector } = req.params;
    const { count = 5, difficulty, persist = true } = req.body || {};

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

// POST /api/v1/sectors/generate-all
// Bulk generates fresh questions across all 5 sectors in one click
router.post('/generate-all', async (req, res, next) => {
  try {
    const { countPerSector = 5, difficulty, persist = true } = req.body || {};
    const results = {};

    for (const cat of config.categories) {
      const resData = await questionService.generateQuestionsForSector({
        sector: cat,
        count: countPerSector,
        difficulty,
        persist,
        ip: req.ip
      });
      results[cat] = {
        generatedCount: resData.count,
        sampleQuestion: resData.questions[0]?.question
      };
    }

    res.status(201).json({
      success: true,
      sectors: config.categories,
      totalGenerated: config.categories.length * countPerSector,
      breakdown: results
    });
  } catch (err) {
    next(err);
  }
});

export default router;
