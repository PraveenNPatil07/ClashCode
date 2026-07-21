import { Router } from 'express';

import { createBattle, getBattle, getBattleDebrief, quickStartBattle, runBattleCode, startAiSparring, startBattle, submitBattleCode } from '../controllers/battleController.js';

export const battleRouter = Router();

battleRouter.post('/', createBattle);
battleRouter.post('/quickstart', quickStartBattle);
battleRouter.get('/:id', getBattle);
battleRouter.get('/:id/debrief', getBattleDebrief);
battleRouter.post('/:id/start', startBattle);
battleRouter.post('/:id/submit', submitBattleCode);
battleRouter.post('/:id/run', runBattleCode);
battleRouter.post('/:id/spar', startAiSparring);
