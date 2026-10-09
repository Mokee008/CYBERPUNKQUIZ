import { z } from 'zod';
import { config } from '../config.js';

export const questionBaseSchema = z.object({
  category: z.enum(config.categories, {
    errorMap: () => ({ message: `Category must be one of: ${config.categories.join(', ')}` })
  }),
  difficulty: z.enum(config.difficulties, {
    errorMap: () => ({ message: `Difficulty must be one of: ${config.difficulties.join(', ')}` })
  }),
  question: z.string().trim().min(10, 'Question must be at least 10 characters').max(300, 'Question cannot exceed 300 characters'),
  options: z.array(z.string().trim().min(1, 'Option cannot be empty').max(120, 'Option cannot exceed 120 characters'))
    .length(4, 'Options array must contain exactly 4 options')
    .refine((opts) => {
      const lower = opts.map(o => o.toLowerCase());
      return new Set(lower).size === 4;
    }, { message: 'All 4 options must be unique' }),
  correctIndex: z.number().int().min(0, 'correctIndex must be between 0 and 3').max(3, 'correctIndex must be between 0 and 3'),
  explanation: z.string().trim().min(10, 'Explanation must be at least 10 characters').max(300, 'Explanation cannot exceed 300 characters'),
  active: z.boolean().default(true)
});

export const questionSchema = questionBaseSchema.extend({
  id: z.number().int().positive('id must be a positive integer')
});

export const createQuestionSchema = questionBaseSchema;

export const updateQuestionSchema = questionBaseSchema;

export const patchQuestionSchema = questionBaseSchema.partial();
