import type { Request, Response } from 'express';
import type { SupportedLanguage } from '@clashcode/shared';

import {
  attachAiOpponent,
  createBattleRecord,
  fetchBattleDetail,
  fetchProblem,
  fetchUsersByIds,
  markBattleDrawIfExpired,
  startBattleIfWaiting
} from '../models/battleModel.js';
import { ensureAiBotUser, fetchOpponentPool, fetchPlayableProblems, findUserById } from '../models/userModel.js';
import { processBattleSubmission } from '../services/battleSubmissionService.js';
import { clearBotTimer, scheduleAiSparringTurn } from '../services/aiSparring.js';
import { battleRoom, getSocketServer, warRoom, isUserOnline } from '../services/socket.js';

const BATTLE_DURATION_MS = 15 * 60 * 1000;
const SPARRING_ELIGIBILITY_MS = 20 * 1000;

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return value === 'python' || value === 'javascript' || value === 'java' || value === 'cpp';
}

function battleHasExpired(startedAt: string | null) {
  if (!startedAt) {
    return false;
  }

  return Date.now() - new Date(startedAt).getTime() >= BATTLE_DURATION_MS;
}

function emitWarUpdate(warId: string | null, payload: Record<string, unknown>) {
  if (!warId) {
    return;
  }

  getSocketServer().to(warRoom(warId)).emit('war:updated', payload);
}

export async function createBattle(request: Request, response: Response): Promise<void> {
  try {
    const { playerAId, playerBId, problemId } = request.body as {
      playerAId?: string;
      playerBId?: string;
      problemId?: string;
    };

    if (!playerAId || !problemId) {
      response.status(400).json({ message: 'playerAId and problemId are required.' });
      return;
    }

    if (playerBId && playerAId === playerBId) {
      response.status(400).json({ message: 'A battle requires two distinct players.' });
      return;
    }

    const userIds = playerBId ? [playerAId, playerBId] : [playerAId];
    const [users, problem] = await Promise.all([fetchUsersByIds(userIds), fetchProblem(problemId)]);
    if (users.length !== userIds.length) {
      response.status(404).json({ message: 'One or more players were not found.' });
      return;
    }

    if (!problem) {
      response.status(404).json({ message: 'Problem not found.' });
      return;
    }

    const battle = await createBattleRecord(playerAId, playerBId ?? null, problemId);
    const detail = await fetchBattleDetail(battle.id);
    response.status(201).json({ battle: detail, waitingForOpponent: !playerBId });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while creating battle.'
    });
  }
}

export async function quickStartBattle(request: Request, response: Response): Promise<void> {
  try {
    const { userId, opponentId, playWithAi } = request.body as {
      userId?: string;
      opponentId?: string;
      playWithAi?: boolean;
    };

    if (!userId) {
      response.status(400).json({ message: 'userId is required.' });
      return;
    }

    const player = await findUserById(userId);
    if (!player) {
      response.status(404).json({ message: 'Player not found.' });
      return;
    }

    if (playWithAi) {
      const [problems, botUser] = await Promise.all([
        fetchPlayableProblems(),
        ensureAiBotUser()
      ]);
      
      if (problems.length === 0) {
        response.status(409).json({ message: 'No playable problems are available yet.' });
        return;
      }
      
      const problem = problems[Math.floor(Math.random() * problems.length)];
      const battle = await createBattleRecord(player.id, null, problem.id);
      await attachAiOpponent(battle.id, botUser.id);
      await startBattleIfWaiting(battle.id);
      const detail = await fetchBattleDetail(battle.id);
      
      scheduleAiSparringTurn({
        battleId: battle.id,
        botUserId: botUser.id,
        problem: detail!.problem
      });
      
      response.status(201).json({ battle: detail });
      return;
    }

    const [opponents, problems] = await Promise.all([
      fetchOpponentPool(userId, opponentId ?? null),
      fetchPlayableProblems()
    ]);

    const onlineOpponents = opponentId ? opponents : opponents.filter(entry => isUserOnline(entry.id));

    const filteredOpponents = onlineOpponents.filter((entry) => entry.id !== userId && entry.college_id !== player.college_id);
    const opponentPool = filteredOpponents.length > 0 ? filteredOpponents : onlineOpponents.filter((entry) => entry.id !== userId);

    if (opponentPool.length === 0) {
      response.status(409).json({ message: 'No online opponents are available right now.' });
      return;
    }

    if (problems.length === 0) {
      response.status(409).json({ message: 'No playable problems are available yet.' });
      return;
    }

    const opponent = opponentPool[Math.floor(Math.random() * opponentPool.length)];
    const problem = problems[Math.floor(Math.random() * problems.length)];
    const battle = await createBattleRecord(player.id, opponent.id, problem.id);
    const detail = await fetchBattleDetail(battle.id);

    response.status(201).json({ battle: detail });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while entering battle.'
    });
  }
}

export async function startBattle(request: Request, response: Response): Promise<void> {
  try {
    const battleId = String(request.params.id ?? '');
    const detail = await fetchBattleDetail(battleId);
    if (!detail) {
      response.status(404).json({ message: 'Battle not found.' });
      return;
    }

    if (!detail.player_b && !detail.is_ai_sparring) {
      response.status(409).json({ message: 'Battle is still waiting for a second player or AI sparring mode.' });
      return;
    }

    if (detail.status === 'completed') {
      response.status(409).json({ message: 'Battle is already completed.', battle: detail });
      return;
    }

    const transition = await startBattleIfWaiting(battleId);
    const updatedBattle = await fetchBattleDetail(battleId);
    if (!updatedBattle) {
      response.status(404).json({ message: 'Battle not found after start attempt.' });
      return;
    }

    if (transition.started) {
      getSocketServer().to(battleRoom(battleId)).emit('battle:started', {
        battleId,
        startedAt: updatedBattle.started_at,
        durationMs: BATTLE_DURATION_MS
      });
      emitWarUpdate(updatedBattle.war_id, {
        warId: updatedBattle.war_id,
        battleId,
        type: 'battle_started'
      });
    }

    response.status(200).json({ battle: updatedBattle, started: transition.started });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while starting battle.'
    });
  }
}

export async function submitBattleCode(request: Request, response: Response): Promise<void> {
  try {
    const battleId = String(request.params.id ?? '');
    const { userId, code, language } = request.body as {
      userId?: string;
      code?: string;
      language?: string;
    };

    if (!userId || !code || !language) {
      response.status(400).json({ message: 'userId, code, and language are required.' });
      return;
    }

    if (!isSupportedLanguage(language)) {
      response.status(400).json({ message: 'language must be one of "python", "javascript", "java", or "cpp".' });
      return;
    }

    const battle = await fetchBattleDetail(battleId);
    if (!battle) {
      response.status(404).json({ message: 'Battle not found.' });
      return;
    }

    if (userId !== battle.player_a_id && userId !== battle.player_b_id) {
      response.status(403).json({ message: 'This player is not part of the battle.' });
      return;
    }

    if (battle.status === 'waiting') {
      response.status(409).json({ message: 'Battle has not started yet.' });
      return;
    }

    if (battle.status === 'active' && battleHasExpired(battle.started_at)) {
      const draw = await markBattleDrawIfExpired(battleId);
      const updatedBattle = await fetchBattleDetail(battleId);
      if (draw.completed && updatedBattle) {
        clearBotTimer(battleId);
        getSocketServer().to(battleRoom(battleId)).emit('battle:completed', {
          battleId,
          result: 'draw',
          winnerId: null,
          endedAt: updatedBattle.ended_at,
          battle: updatedBattle
        });
        emitWarUpdate(updatedBattle.war_id, {
          warId: updatedBattle.war_id,
          battleId,
          type: 'battle_completed'
        });
      }

      response.status(409).json({ message: 'Battle timer expired before this submission was judged.', battle: updatedBattle });
      return;
    }

    if (battle.status === 'completed' && battle.result === 'draw') {
      response.status(409).json({ message: 'Battle ended in a draw and no more submissions are accepted.', battle });
      return;
    }

    const result = await processBattleSubmission({
      battleId,
      userId,
      code,
      language
    });

    response.status(200).json(result);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while submitting code.'
    });
  }
}

export async function startAiSparring(request: Request, response: Response): Promise<void> {
  try {
    const battleId = String(request.params.id ?? '');
    const { userId } = request.body as { userId?: string };

    if (!userId) {
      response.status(400).json({ message: 'userId is required.' });
      return;
    }

    const battle = await fetchBattleDetail(battleId);
    if (!battle) {
      response.status(404).json({ message: 'Battle not found.' });
      return;
    }

    if (battle.player_a_id !== userId) {
      response.status(403).json({ message: 'Only the waiting player can trigger AI sparring.' });
      return;
    }

    if (battle.war_id) {
      response.status(409).json({ message: 'AI sparring is only available for standalone battles.' });
      return;
    }

    if (battle.status !== 'waiting') {
      response.status(409).json({ message: 'This battle is no longer waiting for an opponent.', battle });
      return;
    }

    if (battle.player_b) {
      response.status(409).json({ message: 'This battle already has a second player.', battle });
      return;
    }

    if (Date.now() - new Date(battle.created_at).getTime() < SPARRING_ELIGIBILITY_MS) {
      response.status(409).json({ message: 'AI sparring unlocks after 20 seconds of waiting.', availableInMs: Math.max(0, SPARRING_ELIGIBILITY_MS - (Date.now() - new Date(battle.created_at).getTime())) });
      return;
    }

    const botUser = await ensureAiBotUser();
    await attachAiOpponent(battleId, botUser.id);
    await startBattleIfWaiting(battleId);
    const updatedBattle = await fetchBattleDetail(battleId);

    if (!updatedBattle) {
      response.status(404).json({ message: 'Battle not found after enabling AI sparring.' });
      return;
    }

    const delayMs = scheduleAiSparringTurn({
      battleId,
      botUserId: botUser.id,
      problem: updatedBattle.problem
    });

    getSocketServer().to(battleRoom(battleId)).emit('battle:started', {
      battleId,
      startedAt: updatedBattle.started_at,
      durationMs: BATTLE_DURATION_MS,
      aiSparring: true,
      botDelayMs: delayMs
    });

    response.status(200).json({ battle: updatedBattle, aiSparring: true, botDelayMs: delayMs });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while enabling AI sparring.'
    });
  }
}

export async function runBattleCode(request: Request, response: Response): Promise<void> {
  try {
    const battleId = String(request.params.id ?? '');
    const { userId, code, language } = request.body as {
      userId?: string;
      code?: string;
      language?: string;
    };

    if (!userId || !code || !language) {
      response.status(400).json({ message: 'userId, code, and language are required.' });
      return;
    }

    if (!isSupportedLanguage(language)) {
      response.status(400).json({ message: 'language must be one of "python", "javascript", "java", or "cpp".' });
      return;
    }

    const battle = await fetchBattleDetail(battleId);
    if (!battle) {
      response.status(404).json({ message: 'Battle not found.' });
      return;
    }

    if (userId !== battle.player_a_id && userId !== battle.player_b_id) {
      response.status(403).json({ message: 'This player is not part of the battle.' });
      return;
    }

    if (battle.status !== 'active') {
      response.status(409).json({ message: 'Battle is not active.' });
      return;
    }

    // Only run against the first 2 (sample) test cases — no submission saved
    const sampleCases = (battle.problem.test_cases ?? []).slice(0, 2);
    const { judgeAgainstProblem } = await import('../services/battleSubmissionService.js');
    const judged = await judgeAgainstProblem(code, language, sampleCases);

    response.status(200).json({
      testResults: judged.testResults,
      verdict: judged.verdict,
    });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while running code.'
    });
  }
}

export async function getBattle(request: Request, response: Response): Promise<void> {
  try {
    const battleId = String(request.params.id ?? '');
    const battle = await fetchBattleDetail(battleId);
    if (!battle) {
      response.status(404).json({ message: 'Battle not found.' });
      return;
    }

    if (battle.status === 'active' && battleHasExpired(battle.started_at)) {
      const draw = await markBattleDrawIfExpired(battle.id);
      if (draw.completed) {
        const updatedBattle = await fetchBattleDetail(battle.id);
        clearBotTimer(battle.id);
        getSocketServer().to(battleRoom(battle.id)).emit('battle:completed', {
          battleId: battle.id,
          result: 'draw',
          winnerId: null,
          endedAt: updatedBattle?.ended_at ?? null,
          battle: updatedBattle
        });
        emitWarUpdate(updatedBattle?.war_id ?? battle.war_id, {
          warId: updatedBattle?.war_id ?? battle.war_id,
          battleId: battle.id,
          type: 'battle_completed'
        });
        response.status(200).json({ battle: updatedBattle });
        return;
      }
    }

    response.status(200).json({
      battle,
      durationMs: BATTLE_DURATION_MS,
      instructions: {
        stdin: 'Your program receives one JSON object on stdin.',
        stdout: 'Print only the final answer. Arrays or objects should be valid JSON.'
      }
    });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while fetching battle.'
    });
  }
}

import { generateBattleDebrief } from '../services/aiDebriefService.js';

export async function getBattleDebrief(request: Request, response: Response): Promise<void> {
  try {
    const battleId = request.params.id;
    const { userId } = request.query;

    if (typeof battleId !== 'string' || typeof userId !== 'string') {
      response.status(400).json({ message: 'battleId parameter and userId query are required.' });
      return;
    }

    const debriefMarkdown = await generateBattleDebrief(battleId, userId as string);
    response.json({ debrief: debriefMarkdown });
  } catch (error) {
    console.error('Debrief error:', error);
    response.status(500).json({ message: error instanceof Error ? error.message : 'Failed to generate debrief.' });
  }
}
