import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  questionsPerGame: parseInt(process.env.QUESTIONS_PER_GAME || '30', 10),
  timeLimitSec: parseInt(process.env.TIME_LIMIT_SEC || '20', 10),
  sessionTtlMinutes: parseInt(process.env.SESSION_TTL_MINUTES || '60', 10),
  adminApiKey: process.env.ADMIN_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
  categories: [
    'CA',
    'Healthcare',
    'Programming',
    'Agriculture',
    'Biology'
  ],
  difficulties: ['easy', 'medium', 'hard']
};
