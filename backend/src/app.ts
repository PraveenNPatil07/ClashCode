import cors from 'cors';
import express from 'express';

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

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN
    })
  );
  app.use(express.json());

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
