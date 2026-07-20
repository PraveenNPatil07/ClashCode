import type { BattleDetail } from '@clashcode/shared';

import { supabase } from '../db/supabase.js';

// ---------------------------------------------------------------------------
// College points
// ---------------------------------------------------------------------------

/** Increment a college's total_points by `delta` via the stored RPC. */
export async function addCollegePoints(collegeId: string, delta: number) {
  const { error } = await supabase.rpc('add_college_points', {
    college_uuid: collegeId,
    points_delta: delta
  });

  if (error) {
    throw new Error(`Unable to add college points: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Player (user) points
// ---------------------------------------------------------------------------

/**
 * Increment a user's individual `points` by `delta`.
 * Tries the `add_user_points` RPC first; falls back to a read-then-write if
 * the RPC doesn't exist, so a missing migration never silently drops points.
 * Errors are non-fatal — logged but not re-thrown so the battle result
 * response still returns 200 even on a points update failure.
 */
export async function awardPlayerPoints(userId: string, delta: number): Promise<void> {
  // --- primary path: atomic RPC (preferred, avoids race conditions) ---
  const { error: rpcError } = await supabase.rpc('add_user_points', {
    user_uuid: userId,
    points_delta: delta
  });

  if (!rpcError) return;

  // --- fallback path: read → write (safe for single-player context) ---
  console.warn(`[pointsService] add_user_points RPC unavailable, using fallback: ${rpcError.message}`);

  const { data: row, error: fetchError } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single<{ points: number }>();

  if (fetchError || row === null) {
    console.error(`[pointsService] Cannot fetch user ${userId} for points fallback:`, fetchError);
    return;
  }

  const { error: writeError } = await supabase
    .from('users')
    .update({ points: row.points + delta })
    .eq('id', userId);

  if (writeError) {
    console.error(`[pointsService] Failed to write player points for ${userId}:`, writeError);
  }
}

// ---------------------------------------------------------------------------
// Battle rewards
// ---------------------------------------------------------------------------

/**
 * Award both individual player points and college points after a battle win.
 * Uses Promise.allSettled so neither type of award can block the other.
 */
export async function awardBattleCollegePoints(
  battle: BattleDetail,
  winnerUserId: string
): Promise<void> {
  if (!battle.player_b) return; // solo / waiting — nothing to award

  const isPlayerA = battle.player_a.id === winnerUserId;
  const winner = isPlayerA ? battle.player_a : battle.player_b;
  const loser  = isPlayerA ? battle.player_b : battle.player_a;

  // --- individual points (non-fatal if either fails) ---
  const playerRewards: Promise<void>[] = [awardPlayerPoints(winner.id, 10)];
  if (!battle.is_ai_sparring) {
    playerRewards.push(awardPlayerPoints(loser.id, 2));
  }
  await Promise.allSettled(playerRewards);

  // --- college points ---
  if (winner.college_id === loser.college_id) {
    // Same-college match: reward the shared college a flat 12 pts
    await addCollegePoints(winner.college_id, 12);
    return;
  }

  await Promise.all([
    addCollegePoints(winner.college_id, 10),
    addCollegePoints(loser.college_id, 2)
  ]);
}

// ---------------------------------------------------------------------------
// War bonus
// ---------------------------------------------------------------------------

export async function awardWarBonus(collegeId: string, points = 50): Promise<void> {
  await addCollegePoints(collegeId, points);
}
