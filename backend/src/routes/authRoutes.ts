import { Router } from 'express';

import { signIn, signUp } from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post('/signup', signUp);
authRouter.post('/login', signIn);
