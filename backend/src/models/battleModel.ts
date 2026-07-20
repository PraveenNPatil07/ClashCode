import type { Battle, BattleDetail, Problem, Submission, SupportedLanguage, User } from '@clashcode/shared';

import { supabase } from '../db/supabase.js';

type CompletionRpcResponse = {
  completed: boolean;
  battle_id: string;
  winner_id: string | null;
  result: string;
  ended_at: string | null;
};

type StartRpcResponse = {
  started: boolean;
  started_at: string | null;
};

type DrawRpcResponse = {
  completed: boolean;
  battle_id: string;
  result: string;
  ended_at: string | null;
};

export async function createBattleRecord(playerAId: string, playerBId: string | null, problemId: string, warId?: string | null) {
  const { data, error } = await supabase
    .from('battles')
    .insert({
      player_a_id: playerAId,
      player_b_id: playerBId,
      problem_id: problemId,
      war_id: warId ?? null,
      status: 'waiting',
      result: 'pending',
      is_ai_sparring: false
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Unable to create battle: ${error.message}`);
  }

  return data as Battle;
}

export async function attachAiOpponent(battleId: string, botUserId: string) {
  const { data, error } = await supabase
    .from('battles')
    .update({
      player_b_id: botUserId,
      is_ai_sparring: true
    })
    .eq('id', battleId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Unable to attach AI opponent: ${error.message}`);
  }

  return data as Battle;
}

export async function fetchBattle(battleId: string) {
  const { data, error } = await supabase.from('battles').select('*').eq('id', battleId).maybeSingle();
  if (error) {
    throw new Error(`Unable to fetch battle: ${error.message}`);
  }

  return (data as Battle | null) ?? null;
}

export async function fetchBattlesByWarId(warId: string) {
  const { data, error } = await supabase.from('battles').select('*').eq('war_id', warId).order('created_at', { ascending: true });
  if (error) {
    throw new Error(`Unable to fetch war battles: ${error.message}`);
  }

  return data as Battle[];
}

export async function fetchUsersByIds(userIds: Array<string | null>) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))] as string[];
  if (uniqueIds.length === 0) {
    return [] as User[];
  }

  const { data, error } = await supabase.from('users').select('*').in('id', uniqueIds);
  if (error) {
    throw new Error(`Unable to fetch users: ${error.message}`);
  }

  return data as User[];
}

export async function fetchProblem(problemId: string) {
  const { data, error } = await supabase.from('problems').select('*').eq('id', problemId).maybeSingle();
  if (error) {
    throw new Error(`Unable to fetch problem: ${error.message}`);
  }

  return (data as Problem | null) ?? null;
}

export async function fetchProblemsByIds(problemIds: string[]) {
  const uniqueIds = [...new Set(problemIds)];
  if (uniqueIds.length === 0) {
    return [] as Problem[];
  }

  const { data, error } = await supabase.from('problems').select('*').in('id', uniqueIds);
  if (error) {
    throw new Error(`Unable to fetch problems: ${error.message}`);
  }

  return data as Problem[];
}

export async function fetchSubmissionsForBattle(battleId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('battle_id', battleId)
    .order('submitted_at', { ascending: true });

  if (error) {
    throw new Error(`Unable to fetch submissions: ${error.message}`);
  }

  return data as Submission[];
}

export async function fetchBattleDetail(battleId: string): Promise<BattleDetail | null> {
  const battle = await fetchBattle(battleId);
  if (!battle) {
    return null;
  }

  const [users, problem, submissions] = await Promise.all([
    fetchUsersByIds([battle.player_a_id, battle.player_b_id]),
    fetchProblem(battle.problem_id),
    fetchSubmissionsForBattle(battleId)
  ]);

  if (!problem) {
    throw new Error(`Problem ${battle.problem_id} was not found for battle ${battleId}.`);
  }

  const playerA = users.find((user) => user.id === battle.player_a_id);
  const playerB = battle.player_b_id ? users.find((user) => user.id === battle.player_b_id) ?? null : null;

  if (!playerA) {
    throw new Error(`Battle ${battleId} references a missing player_a.`);
  }

  return {
    ...battle,
    problem,
    player_a: {
      id: playerA.id,
      name: playerA.name,
      email: playerA.email,
      college_id: playerA.college_id,
      points: playerA.points,
      is_ai_bot: playerA.is_ai_bot ?? false
    },
    player_b: playerB
      ? {
          id: playerB.id,
          name: playerB.name,
          email: playerB.email,
          college_id: playerB.college_id,
          points: playerB.points,
          is_ai_bot: playerB.is_ai_bot ?? false
        }
      : null,
    submissions
  };
}

export async function insertPendingSubmission(battleId: string, userId: string, code: string, language: SupportedLanguage) {
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      battle_id: battleId,
      user_id: userId,
      code,
      language,
      verdict: 'pending'
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Unable to create submission: ${error.message}`);
  }

  return data as Submission;
}

export async function updateSubmissionResult(submissionId: string, payload: Partial<Submission>) {
  const { data, error } = await supabase
    .from('submissions')
    .update(payload)
    .eq('id', submissionId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Unable to update submission: ${error.message}`);
  }

  return data as Submission;
}

export async function startBattleIfWaiting(battleId: string) {
  const { data, error } = await supabase.rpc('start_battle_if_waiting', {
    battle_uuid: battleId
  });

  if (error) {
    throw new Error(`Unable to start battle: ${error.message}`);
  }

  return ((data ?? [])[0] ?? { started: false, started_at: null }) as StartRpcResponse;
}

export async function completeBattleIfUnclaimed(battleId: string, winnerId: string) {
  const { data, error } = await supabase.rpc('complete_battle_if_unclaimed', {
    battle_uuid: battleId,
    winner_user_uuid: winnerId,
    winner_points: 10,
    loser_points: 2
  });

  if (error) {
    throw new Error(`Unable to complete battle: ${error.message}`);
  }

  return ((data ?? [])[0] ?? {
    completed: false,
    battle_id: battleId,
    winner_id: null,
    result: 'pending',
    ended_at: null
  }) as CompletionRpcResponse;
}

export async function markBattleDrawIfExpired(battleId: string) {
  const { data, error } = await supabase.rpc('mark_battle_draw_if_expired', {
    battle_uuid: battleId
  });

  if (error) {
    throw new Error(`Unable to mark battle draw: ${error.message}`);
  }

  return ((data ?? [])[0] ?? {
    completed: false,
    battle_id: battleId,
    result: 'pending',
    ended_at: null
  }) as DrawRpcResponse;
}
