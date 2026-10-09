import { createApp } from './app.js';
import { config } from './config.js';
import { questionRepo } from './repositories/questionRepo.js';
import { validateQuestionBank } from './utils/validateQuestions.js';
import { sessionRepo } from './repositories/sessionRepo.js';

// Startup integrity validation
try {
  console.log('[Startup] Validating question bank integrity...');
  const questions = questionRepo.getAll();
  validateQuestionBank(questions);
  console.log(`[Startup] Question bank verified: ${questions.length} questions loaded (${questions.filter(q => q.active).length} active).`);
} catch (err) {
  console.error('[Startup Error] Question bank validation failed loudly:\n', err.message);
  process.exit(1);
}

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`\n======================================================`);
  console.log(`  ATELIER QUIZ GAME BACKEND RUNNING`);
  console.log(`  Port: http://localhost:${config.port}`);
  console.log(`  Preview Page: http://localhost:${config.port}/preview`);
  console.log(`  Health Check: http://localhost:${config.port}/api/v1/health`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Questions Per Game: ${config.questionsPerGame}`);
  console.log(`======================================================\n`);
});

// Periodic session cleanup for expired sessions
const cleanupInterval = setInterval(() => {
  sessionRepo.cleanExpired(config.sessionTtlMinutes);
}, 15 * 60 * 1000);

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Closing server cleanly...`);
  clearInterval(cleanupInterval);
  server.close(() => {
    console.log('[Shutdown] Server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { server, app };
