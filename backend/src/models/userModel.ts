import type { Battle, College, Problem, User } from '@clashcode/shared';

import { supabase } from '../db/supabase.js';

const AI_BOT_EMAIL = 'sparring.bot@clashcode.ai';

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.from('users').select('*').eq('email', normalizedEmail).maybeSingle();
  if (error) {
    throw new Error(`Unable to find user by email: ${error.message}`);
  }

  return (data as User | null) ?? null;
}

export async function findUserById(userId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) {
    throw new Error(`Unable to fetch user: ${error.message}`);
  }

  return (data as User | null) ?? null;
}

export async function createUserProfile(input: { name: string; email: string; collegeId: string }) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      college_id: input.collegeId,
      rank_tier: 'bronze',
      points: 0,
      role: 'member',
      is_ai_bot: false
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Unable to create user: ${error.message}`);
  }

  return data as User;
}

export async function fetchCollegeById(collegeId: string) {
  const { data, error } = await supabase.from('colleges').select('*').eq('id', collegeId).maybeSingle();
  if (error) {
    throw new Error(`Unable to fetch college: ${error.message}`);
  }

  return (data as College | null) ?? null;
}

export async function fetchAnyCollege() {
  const { data, error } = await supabase.from('colleges').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error) {
    throw new Error(`Unable to fetch fallback college: ${error.message}`);
  }

  return (data as College | null) ?? null;
}

export async function ensureAiBotUser() {
  const existing = await findUserByEmail(AI_BOT_EMAIL);
  if (existing) {
    return existing;
  }

  const college = await fetchAnyCollege();
  if (!college) {
    throw new Error('Cannot create AI bot user because no colleges exist.');
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      name: 'ClashCode AI',
      email: AI_BOT_EMAIL,
      college_id: college.id,
      rank_tier: 'diamond',
      points: 0,
      role: 'member',
      is_ai_bot: true
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Unable to create AI bot user: ${error.message}`);
  }

  return data as User;
}

export async function fetchLeaderboard(limit = 4) {
  const { data, error } = await supabase
    .from('colleges')
    .select('*')
    .order('total_points', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to fetch leaderboard: ${error.message}`);
  }

  return data as College[];
}

export async function fetchSuggestedOpponents(userId: string, collegeId: string, limit = 6) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, college_id, rank_tier, points, colleges(name), is_ai_bot')
    .neq('id', userId)
    .neq('college_id', collegeId)
    .eq('is_ai_bot', false)
    .order('points', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to fetch suggested opponents: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    college_id: row.college_id,
    rank_tier: row.rank_tier,
    points: row.points,
    college_name: row.colleges?.name ?? 'Unknown College'
  }));
}

export async function fetchUserBattles(userId: string, limit = 8) {
  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to fetch user battles: ${error.message}`);
  }

  return data as Battle[];
}

export async function fetchUsersByIds(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) {
    return [] as User[];
  }

  const { data, error } = await supabase.from('users').select('*').in('id', uniqueIds);
  if (error) {
    throw new Error(`Unable to fetch users: ${error.message}`);
  }

  return data as User[];
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

export async function fetchPlayableProblems() {
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .neq('category', 'sql')
    .order('difficulty', { ascending: true });

  if (error) {
    throw new Error(`Unable to fetch playable problems: ${error.message}`);
  }

  return data as Problem[];
}

export async function fetchOpponentPool(userId: string, preferredOpponentId?: string | null) {
  if (preferredOpponentId) {
    const chosen = await findUserById(preferredOpponentId);
    return chosen && chosen.id !== userId && !chosen.is_ai_bot ? [chosen] : [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', userId)
    .eq('is_ai_bot', false)
    .order('points', { ascending: false });

  if (error) {
    throw new Error(`Unable to fetch opponents: ${error.message}`);
  }

  return data as User[];
}
