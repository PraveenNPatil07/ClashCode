import { Router } from 'express';

import { createBattle, getBattle, quickStartBattle, runBattleCode, startAiSparring, startBattle, submitBattleCode } from '../controllers/battleController.js';

export const battleRouter = Router();

battleRouter.post('/', createBattle);
battleRouter.post('/quickstart', quickStartBattle);
battleRouter.get('/:id', getBattle);
battleRouter.post('/:id/start', startBattle);
battleRouter.post('/:id/submit', submitBattleCode);
battleRouter.post('/:id/run', runBattleCode);
battleRouter.post('/:id/spar', startAiSparring);
