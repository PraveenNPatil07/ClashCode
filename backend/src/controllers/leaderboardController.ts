import type { Request, Response } from 'express';

import { fetchAllBattles, fetchActiveSeason, fetchAllWars, fetchSeasonById, fetchStudentLeaderboard, updateSeason, fetchCollegeLeaderboard } from '../models/leaderboardModel.js';
import { fetchUsersByIds } from '../models/battleModel.js';

function parseLimit(rawLimit: unknown, fallback = 20) {
  const parsed = Number(rawLimit ?? fallback);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 100);
}

export async function getCollegeLeaderboard(request: Request, response: Response): Promise<void> {
  try {
    const limit = parseLimit(request.query.limit);
    const [colleges, wars, battles] = await Promise.all([
      fetchCollegeLeaderboard(limit),
      fetchAllWars(),
      fetchAllBattles()
    ]);

    const winnerIds = battles.map((battle) => battle.winner_id).filter(Boolean) as string[];
    const battleUsers = winnerIds.length > 0 ? await fetchUsersByIds(winnerIds) : [];

    const ranked = colleges.map((college, index) => {
      const warsWon = wars.filter((war) => war.status === 'completed' && war.winner_college_id === college.id).length;
      const battlesWon = battles.filter((battle) => {
        if (battle.status !== 'completed' || !battle.winner_id) {
          return false;
        }

        const winner = battleUsers.find((user) => user.id === battle.winner_id);
        return winner?.college_id === college.id;
      }).length;

      return {
        rank: index + 1,
        id: college.id,
        name: college.name,
        total_points: college.total_points,
        base_level: college.base_level,
        wars_won: warsWon,
        battles_won: battlesWon
      };
    });

    response.status(200).json({ leaderboard: ranked });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected error while loading college leaderboard.' });
  }
}

export async function getStudentLeaderboard(request: Request, response: Response): Promise<void> {
  try {
    const limit = parseLimit(request.query.limit);
    const students = await fetchStudentLeaderboard(limit);
    const ranked = students.map((student, index) => ({
      rank: index + 1,
      id: student.id,
      name: student.name,
      points: student.points,
      rank_tier: student.rank_tier,
      college_name: student.college_name
    }));

    response.status(200).json({ leaderboard: ranked });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected error while loading student leaderboard.' });
  }
}

export async function getCurrentSeason(_request: Request, response: Response): Promise<void> {
  try {
    const season = await fetchActiveSeason();
    if (!season) {
      response.status(404).json({ message: 'No active season found.' });
      return;
    }

    response.status(200).json({ season });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected error while fetching current season.' });
  }
}

export async function endSeason(request: Request, response: Response): Promise<void> {
  try {
    const seasonId = String(request.params.id ?? '');
    const season = await fetchSeasonById(seasonId);
    if (!season) {
      response.status(404).json({ message: 'Season not found.' });
      return;
    }

    const [collegeLeaderboard, studentLeaderboard] = await Promise.all([
      fetchCollegeLeaderboard(1),
      fetchStudentLeaderboard(1)
    ]);

    const updated = await updateSeason(seasonId, {
      status: 'completed',
      winner_college_id: collegeLeaderboard[0]?.id ?? null,
      mvp_user_id: studentLeaderboard[0]?.id ?? null,
      end_date: new Date().toISOString()
    });

    response.status(200).json({ season: updated });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected error while ending season.' });
  }
}
