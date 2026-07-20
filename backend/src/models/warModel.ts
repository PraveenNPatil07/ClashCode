import type { Battle, College, Problem, User, War } from '@clashcode/shared';

import { supabase } from '../db/supabase.js';

export async function createWarRecord(input: {
  collegeAId: string;
  collegeBId: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active';
}) {
  const { data, error } = await supabase
    .from('wars')
    .insert({
      college_a_id: input.collegeAId,
      college_b_id: input.collegeBId,
      start_time: input.startTime,
      end_time: input.endTime,
      status: input.status
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Unable to create war: ${error.message}`);
  }

  return data as War;
}

export async function fetchWar(warId: string) {
  const { data, error } = await supabase.from('wars').select('*').eq('id', warId).maybeSingle();
  if (error) {
    throw new Error(`Unable to fetch war: ${error.message}`);
  }

  return (data as War | null) ?? null;
}

export async function updateWarStatus(warId: string, payload: Partial<War>) {
  const { data, error } = await supabase.from('wars').update(payload).eq('id', warId).select('*').single();
  if (error) {
    throw new Error(`Unable to update war: ${error.message}`);
  }

  return data as War;
}

export async function fetchCollegesByIds(collegeIds: string[]) {
  const uniqueIds = [...new Set(collegeIds)];
  if (uniqueIds.length === 0) {
    return [] as College[];
  }

  const { data, error } = await supabase.from('colleges').select('*').in('id', uniqueIds);
  if (error) {
    throw new Error(`Unable to fetch colleges: ${error.message}`);
  }

  return data as College[];
}

export async function fetchWarBattles(warId: string) {
  const { data, error } = await supabase.from('battles').select('*').eq('war_id', warId).order('created_at', { ascending: true });
  if (error) {
    throw new Error(`Unable to fetch war battles: ${error.message}`);
  }

  return data as Battle[];
}

export async function fetchWarUsers(warId: string) {
  const battles = await fetchWarBattles(warId);
  const userIds = battles.flatMap((battle) => [battle.player_a_id, battle.player_b_id, battle.winner_id]).filter(Boolean) as string[];
  if (userIds.length === 0) {
    return [] as User[];
  }

  const { data, error } = await supabase.from('users').select('*').in('id', [...new Set(userIds)]);
  if (error) {
    throw new Error(`Unable to fetch war users: ${error.message}`);
  }

  return data as User[];
}

export async function fetchWarProblems(warId: string) {
  const battles = await fetchWarBattles(warId);
  const problemIds = battles.map((battle) => battle.problem_id);
  if (problemIds.length === 0) {
    return [] as Problem[];
  }

  const { data, error } = await supabase.from('problems').select('*').in('id', [...new Set(problemIds)]);
  if (error) {
    throw new Error(`Unable to fetch war problems: ${error.message}`);
  }

  return data as Problem[];
}

export async function fetchAllCompletedWars() {
  const { data, error } = await supabase.from('wars').select('*').eq('status', 'completed');
  if (error) {
    throw new Error(`Unable to fetch completed wars: ${error.message}`);
  }

  return data as War[];
}

export async function fetchCompletedBattleSummaries() {
  const { data, error } = await supabase
    .from('battles')
    .select('id, winner_id, player_a_id, player_b_id, war_id, status, result')
    .eq('status', 'completed');

  if (error) {
    throw new Error(`Unable to fetch completed battles: ${error.message}`);
  }

  return data as Array<{
    id: string;
    winner_id: string | null;
    player_a_id: string;
    player_b_id: string;
    war_id: string | null;
    status: string;
    result: string;
  }>;
}
