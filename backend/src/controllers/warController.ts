import type { Request, Response } from 'express';
import type { Battle, College, Problem, User } from '@clashcode/shared';

import { createBattleRecord, fetchBattleDetail, fetchProblem, fetchUsersByIds } from '../models/battleModel.js';
import { fetchCollegeById } from '../models/userModel.js';
import { createWarRecord, fetchCollegesByIds, fetchWar, fetchWarBattles, fetchWarProblems, fetchWarUsers, updateWarStatus } from '../models/warModel.js';
import { awardWarBonus } from '../services/pointsService.js';
import { getSocketServer, warRoom } from '../services/socket.js';

const DEFAULT_WAR_DURATION_MINUTES = 30;
const WAR_BONUS_POINTS = 50;

type WarBattleView = {
  id: string;
  status: string;
  result: string;
  winner_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  war_id: string | null;
  problem: {
    id: string;
    title: string;
    difficulty: string;
    category: string;
  } | null;
  player_a: { id: string; name: string; college_id: string } | null;
  player_b: { id: string; name: string; college_id: string } | null;
};

function buildWarBattleViews(battles: Battle[], users: User[], problems: Problem[]): WarBattleView[] {
  const userMap = new Map(users.map((user) => [user.id, user]));
  const problemMap = new Map(problems.map((problem) => [problem.id, problem]));

  return battles.map((battle) => {
    const problem = problemMap.get(battle.problem_id) ?? null;
    const playerA = userMap.get(battle.player_a_id) ?? null;
    const playerB = battle.player_b_id ? userMap.get(battle.player_b_id) ?? null : null;

    return {
      id: battle.id,
      status: battle.status,
      result: battle.result,
      winner_id: battle.winner_id,
      started_at: battle.started_at,
      ended_at: battle.ended_at,
      created_at: battle.created_at,
      war_id: battle.war_id,
      problem: problem
        ? {
            id: problem.id,
            title: problem.title,
            difficulty: problem.difficulty,
            category: problem.category
          }
        : null,
      player_a: playerA
        ? {
            id: playerA.id,
            name: playerA.name,
            college_id: playerA.college_id
          }
        : null,
      player_b: playerB
        ? {
            id: playerB.id,
            name: playerB.name,
            college_id: playerB.college_id
          }
        : null
    };
  });
}

function computeWarScore(collegeAId: string, collegeBId: string, battles: WarBattleView[]) {
  let collegeAWins = 0;
  let collegeBWins = 0;

  for (const battle of battles) {
    if (!battle.winner_id) {
      continue;
    }

    const winner = battle.player_a?.id === battle.winner_id ? battle.player_a : battle.player_b?.id === battle.winner_id ? battle.player_b : null;
    if (!winner) {
      continue;
    }

    if (winner.college_id === collegeAId) {
      collegeAWins += 1;
    }

    if (winner.college_id === collegeBId) {
      collegeBWins += 1;
    }
  }

  return { collegeAWins, collegeBWins };
}

async function buildWarState(warId: string) {
  const war = await fetchWar(warId);
  if (!war) {
    return null;
  }

  const [colleges, battles, users, problems] = await Promise.all([
    fetchCollegesByIds([war.college_a_id, war.college_b_id, war.winner_college_id].filter(Boolean) as string[]),
    fetchWarBattles(war.id),
    fetchWarUsers(war.id),
    fetchWarProblems(war.id)
  ]);

  const battleViews = buildWarBattleViews(battles, users, problems);
  const score = computeWarScore(war.college_a_id, war.college_b_id, battleViews);

  return {
    war,
    colleges: {
      collegeA: colleges.find((college) => college.id === war.college_a_id) ?? null,
      collegeB: colleges.find((college) => college.id === war.college_b_id) ?? null,
      winner: war.winner_college_id ? colleges.find((college) => college.id === war.winner_college_id) ?? null : null
    },
    score,
    battles: battleViews
  };
}

export async function createWar(request: Request, response: Response): Promise<void> {
  try {
    const { collegeAId, collegeBId, startTime, endTime, durationMinutes } = request.body as {
      collegeAId?: string;
      collegeBId?: string;
      startTime?: string;
      endTime?: string;
      durationMinutes?: number;
    };

    if (!collegeAId || !collegeBId) {
      response.status(400).json({ message: 'collegeAId and collegeBId are required.' });
      return;
    }

    if (collegeAId === collegeBId) {
      response.status(400).json({ message: 'A war requires two distinct colleges.' });
      return;
    }

    const [collegeA, collegeB] = await Promise.all([fetchCollegeById(collegeAId), fetchCollegeById(collegeBId)]);
    if (!collegeA || !collegeB) {
      response.status(404).json({ message: 'One or both colleges were not found.' });
      return;
    }

    const start = startTime ? new Date(startTime) : new Date();
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + (durationMinutes ?? DEFAULT_WAR_DURATION_MINUTES) * 60 * 1000);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      response.status(400).json({ message: 'start_time and end_time must define a valid positive window.' });
      return;
    }

    const status = start <= new Date() ? 'active' : 'scheduled';
    const war = await createWarRecord({
      collegeAId,
      collegeBId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status
    });

    response.status(201).json({ war });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected error while creating war.' });
  }
}

export async function scheduleWarBattle(request: Request, response: Response): Promise<void> {
  try {
    const warId = String(request.params.id ?? '');
    const { playerAId, playerBId, problemId } = request.body as {
      playerAId?: string;
      playerBId?: string;
      problemId?: string;
    };

    if (!playerAId || !playerBId || !problemId) {
      response.status(400).json({ message: 'playerAId, playerBId, and problemId are required.' });
      return;
    }

    const war = await fetchWar(warId);
    if (!war) {
      response.status(404).json({ message: 'War not found.' });
      return;
    }

    if (war.status === 'completed') {
      response.status(409).json({ message: 'Completed wars cannot receive new battles.' });
      return;
    }

    const [users, problem] = await Promise.all([fetchUsersByIds([playerAId, playerBId]), fetchProblem(problemId)]);
    if (users.length !== 2) {
      response.status(404).json({ message: 'One or both players were not found.' });
      return;
    }

    if (!problem) {
      response.status(404).json({ message: 'Problem not found.' });
      return;
    }

    const playerA = users.find((user) => user.id === playerAId)!;
    const playerB = users.find((user) => user.id === playerBId)!;
    const validPair =
      (playerA.college_id === war.college_a_id && playerB.college_id === war.college_b_id) ||
      (playerA.college_id === war.college_b_id && playerB.college_id === war.college_a_id);

    if (!validPair) {
      response.status(400).json({ message: 'Players must belong to opposing colleges in this war.' });
      return;
    }

    const battle = await createBattleRecord(playerAId, playerBId, problemId, war.id);
    const detail = await fetchBattleDetail(battle.id);
    getSocketServer().to(warRoom(war.id)).emit('war:updated', { warId: war.id, battleId: battle.id, type: 'battle_scheduled' });
    response.status(201).json({ battle: detail });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected error while scheduling war battle.' });
  }
}

export async function getWar(request: Request, response: Response): Promise<void> {
  try {
    const state = await buildWarState(String(request.params.id ?? ''));
    if (!state) {
      response.status(404).json({ message: 'War not found.' });
      return;
    }

    response.status(200).json(state);
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected error while fetching war.' });
  }
}

export async function closeWar(request: Request, response: Response): Promise<void> {
  try {
    const warId = String(request.params.id ?? '');
    const state = await buildWarState(warId);
    if (!state) {
      response.status(404).json({ message: 'War not found.' });
      return;
    }

    if (state.war.status === 'completed') {
      response.status(200).json(state);
      return;
    }

    let winnerCollegeId: string | null = null;
    if (state.score.collegeAWins > state.score.collegeBWins) {
      winnerCollegeId = state.war.college_a_id;
    } else if (state.score.collegeBWins > state.score.collegeAWins) {
      winnerCollegeId = state.war.college_b_id;
    }

    const updatedWar = await updateWarStatus(warId, {
      status: 'completed',
      winner_college_id: winnerCollegeId
    });

    if (winnerCollegeId) {
      await awardWarBonus(winnerCollegeId, WAR_BONUS_POINTS);
    }

    const refreshed = await buildWarState(updatedWar.id);
    getSocketServer().to(warRoom(updatedWar.id)).emit('war:updated', { warId: updatedWar.id, type: 'war_closed' });
    response.status(200).json({ ...refreshed, warBonusAwarded: winnerCollegeId ? WAR_BONUS_POINTS : 0, tie: winnerCollegeId === null });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected error while closing war.' });
  }
}
