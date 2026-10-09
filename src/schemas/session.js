import { z } from 'zod';
import { config } from '../config.js';

export const startSessionSchema = z.object({
  playerName: z.string().trim().min(1, 'Player name is required').max(30, 'Player name cannot exceed 30 characters'),
  category: z.enum(config.categories).optional(),
  difficulty: z.enum(config.difficulties).optional(),
  count: z.number().int().min(1, 'Count must be at least 1').max(50, 'Count cannot exceed 50').optional()
});

export const submitAnswerSchema = z.object({
  questionId: z.number().int().positive('questionId must be a positive integer'),
  selectedIndex: z.number().int().min(0, 'selectedIndex must be between 0 and 3').max(3, 'selectedIndex must be between 0 and 3')
});

export const practiceVerifySchema = z.object({
  questionId: z.number().int().positive('questionId must be a positive integer'),
  selectedIndex: z.number().int().min(0, 'selectedIndex must be between 0 and 3').max(3, 'selectedIndex must be between 0 and 3')
});
