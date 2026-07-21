import type { Request, Response } from 'express';

import { fetchCollegeById, fetchLeaderboard, fetchProblemsByIds, fetchSuggestedOpponents, fetchUserBattles, fetchUsersByIds, findUserById } from '../models/userModel.js';
import { isUserOnline } from '../services/socket.js';

export async function getDashboard(request: Request, response: Response): Promise<void> {
  try {
    const userId = String(request.params.id ?? '');
    const user = await findUserById(userId);
    if (!user) {
      response.status(404).json({ message: 'User not found.' });
      return;
    }

    let [college, leaderboard, suggestedOpponents, battles] = await Promise.all([
      fetchCollegeById(user.college_id),
      fetchLeaderboard(4),
      fetchSuggestedOpponents(user.id, user.college_id, 50),
      fetchUserBattles(user.id, 8)
    ]);

    suggestedOpponents = suggestedOpponents.filter(opp => isUserOnline(opp.id)).slice(0, 6);

    const otherUserIds = battles.flatMap((battle) => [battle.player_a_id, battle.player_b_id]).filter((id) => Boolean(id) && id !== user.id) as string[];
    const problemIds = battles.map((battle) => battle.problem_id);
    const [battleUsers, problems] = await Promise.all([fetchUsersByIds(otherUserIds), fetchProblemsByIds(problemIds)]);

    const battleCards = battles.map((battle) => {
      const opponentId = battle.player_a_id === user.id ? battle.player_b_id : battle.player_a_id;
      const opponent = opponentId ? battleUsers.find((entry) => entry.id === opponentId) : null;
      const problem = problems.find((entry) => entry.id === battle.problem_id);

      return {
        id: battle.id,
        status: battle.status,
        result: battle.result,
        winner_id: battle.winner_id,
        started_at: battle.started_at,
        ended_at: battle.ended_at,
        created_at: battle.created_at,
        war_id: battle.war_id,
        opponent: opponent
          ? {
              id: opponent.id,
              name: opponent.name,
              points: opponent.points,
              rank_tier: opponent.rank_tier
            }
          : null,
        problem: problem
          ? {
              id: problem.id,
              title: problem.title,
              difficulty: problem.difficulty,
              category: problem.category
            }
          : null
      };
    });

    response.status(200).json({
      user,
      college,
      leaderboard,
      suggestedOpponents,
      activeBattles: battleCards.filter((battle) => battle.status !== 'completed'),
      recentBattles: battleCards
    });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unexpected error while building dashboard.'
    });
  }
}
