import crypto from 'node:crypto';
import { config } from '../config.js';

export function adminAuth(req, res, next) {
  // If ADMIN_API_KEY is not configured, admin routes are disabled
  if (!config.adminApiKey || config.adminApiKey.trim() === '') {
    return res.status(503).json({
      error: {
        code: 'ADMIN_DISABLED',
        message: 'Admin API is disabled because ADMIN_API_KEY is not configured in the environment'
      }
    });
  }

  const providedKey = req.headers['x-admin-key'];
  if (!providedKey || typeof providedKey !== 'string') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid x-admin-key header'
      }
    });
  }

  // Constant-time comparison
  const expectedBuffer = Buffer.from(config.adminApiKey);
  const providedBuffer = Buffer.from(providedKey);

  if (expectedBuffer.length !== providedBuffer.length) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid x-admin-key'
      }
    });
  }

  const matches = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  if (!matches) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid x-admin-key'
      }
    });
  }

  next();
}
