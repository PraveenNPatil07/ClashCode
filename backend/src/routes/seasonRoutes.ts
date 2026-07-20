import { Router } from 'express';

import { endSeason, getCurrentSeason } from '../controllers/leaderboardController.js';

export const seasonRouter = Router();

seasonRouter.get('/current', getCurrentSeason);
seasonRouter.post('/:id/end', endSeason);
