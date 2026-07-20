import { Router } from 'express';

import { getDashboard } from '../controllers/userController.js';

export const userRouter = Router();

userRouter.get('/:id/dashboard', getDashboard);
