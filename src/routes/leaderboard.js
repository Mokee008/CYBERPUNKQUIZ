import { Router } from 'express';
import { leaderboardRepo } from '../repositories/leaderboardRepo.js';

const router = Router();

router.get('/', (req, res) => {
  const leaderboard = leaderboardRepo.getAll();
  res.status(200).json({ leaderboard });
});

export default router;
