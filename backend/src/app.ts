import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';

import { env } from './db/env.js';
import { authRouter } from './routes/authRoutes.js';
import { battleRouter } from './routes/battleRoutes.js';
import { collegeRouter } from './routes/collegeRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { leaderboardRouter } from './routes/leaderboardRoutes.js';
import { problemRouter } from './routes/problemRoutes.js';
import { seasonRouter } from './routes/seasonRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { warRouter } from './routes/warRoutes.js';

// ── Rate limiters ─────────────────────────────────────────────────────────────

/** General API limiter — 200 requests per minute per IP */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' }
});

/** Tight limiter for code execution endpoints to protect judge quota */
const judgeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many code submissions. Please wait before trying again.' }
});

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN
    })
  );
  app.use(express.json());

  // Apply general limiter to all API routes
  app.use('/api', generalLimiter);

  // Apply tight limiter to code execution routes
  app.use('/api/battles/:id/submit', judgeLimiter);
  app.use('/api/battles/:id/run',    judgeLimiter);

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/colleges', collegeRouter);
  app.use('/api/battles', battleRouter);
  app.use('/api/problems', problemRouter);
  app.use('/api/wars', warRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/seasons', seasonRouter);

  return app;
}

