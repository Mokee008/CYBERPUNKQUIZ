import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import healthRouter from './routes/health.js';
import sessionsRouter from './routes/sessions.js';
import leaderboardRouter from './routes/leaderboard.js';
import adminRouter from './routes/admin.js';
import sectorsRouter from './routes/sectors.js';
import questionsRouter from './routes/questions.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Security headers (configured to allow canvas inline scripts for preview)
  app.use(
    helmet({
      contentSecurityPolicy: false // Allow preview canvas and web audio to run cleanly
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
    })
  );

  // JSON Body Parser
  app.use(express.json({ limit: '2mb' }));

  // General API Rate Limiter: 60 requests per minute
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: config.rateLimitMax || 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Limit is 60 requests per minute.'
        }
      });
    }
  });

  app.use('/api', apiLimiter);

  // Serve static preview page at /preview
  const publicDir = path.resolve(__dirname, '../public');
  app.use('/preview', express.static(path.join(publicDir, 'preview')));

  // Root redirect to preview
  app.get('/', (req, res) => {
    res.redirect('/preview');
  });

  // API v1 Routes
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/sectors', sectorsRouter);
  app.use('/api/v1/questions', questionsRouter);
  app.use('/api/v1/sessions', sessionsRouter);
  app.use('/api/v1/leaderboard', leaderboardRouter);
  app.use('/api/v1/admin', adminRouter);

  // 404 Handler for unknown routes
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`
      }
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
