import { Router } from 'express';

import { closeWar, createWar, getWar, scheduleWarBattle } from '../controllers/warController.js';

export const warRouter = Router();

warRouter.post('/', createWar);
warRouter.get('/:id', getWar);
warRouter.post('/:id/battles', scheduleWarBattle);
warRouter.post('/:id/close', closeWar);
