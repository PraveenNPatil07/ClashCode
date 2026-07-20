import type { Battle, Season, User, War } from '@clashcode/shared';

import { supabase } from '../db/supabase.js';

export async function fetchCollegeLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from('colleges')
    .select('*')
    .order('total_points', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to fetch college leaderboard: ${error.message}`);
  }

  return data as Array<{ id: string; name: string; banner_url: string | null; total_points: number; base_level: number; created_at: string }>;
}

export async function fetchStudentLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, college_id, rank_tier, points, role, created_at, colleges(name), is_ai_bot')
    .eq('is_ai_bot', false)
    .order('points', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to fetch student leaderboard: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    ...(row as User),
    college_name: row.colleges?.name ?? 'Unknown College'
  }));
}

export async function fetchActiveSeason() {
  const { data, error } = await supabase.from('seasons').select('*').eq('status', 'active').order('start_date', { ascending: false }).limit(1).maybeSingle();
  if (error) {
    throw new Error(`Unable to fetch current season: ${error.message}`);
  }

  return (data as Season | null) ?? null;
}

export async function fetchSeasonById(seasonId: string) {
  const { data, error } = await supabase.from('seasons').select('*').eq('id', seasonId).maybeSingle();
  if (error) {
    throw new Error(`Unable to fetch season: ${error.message}`);
  }

  return (data as Season | null) ?? null;
}

export async function updateSeason(seasonId: string, payload: Partial<Season>) {
  const { data, error } = await supabase.from('seasons').update(payload).eq('id', seasonId).select('*').single();
  if (error) {
    throw new Error(`Unable to update season: ${error.message}`);
  }

  return data as Season;
}

export async function fetchAllWars() {
  const { data, error } = await supabase.from('wars').select('*');
  if (error) {
    throw new Error(`Unable to fetch wars: ${error.message}`);
  }

  return data as War[];
}

export async function fetchAllBattles() {
  const { data, error } = await supabase.from('battles').select('*').eq('is_ai_sparring', false);
  if (error) {
    throw new Error(`Unable to fetch battles: ${error.message}`);
  }

  return data as Battle[];
}
