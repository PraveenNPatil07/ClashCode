import { Router } from 'express';

import { getCollegeLeaderboard, getStudentLeaderboard } from '../controllers/leaderboardController.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/colleges', getCollegeLeaderboard);
leaderboardRouter.get('/students', getStudentLeaderboard);
