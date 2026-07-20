import { Router } from 'express';

import { getColleges } from '../controllers/collegeController.js';

export const collegeRouter = Router();

collegeRouter.get('/', getColleges);
