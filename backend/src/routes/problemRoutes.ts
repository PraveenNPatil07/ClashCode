import { Router } from 'express';

import { generateProblemHandler } from '../controllers/problemController.js';

export const problemRouter = Router();

problemRouter.post('/generate', generateProblemHandler);
