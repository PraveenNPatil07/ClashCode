import type { BattleDetail } from '@clashcode/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();
const singleMock = vi.fn();
const updateEqMock = vi.fn();
const selectEqMock = vi.fn(() => ({ single: singleMock }));
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const selectMock = vi.fn(() => ({ eq: selectEqMock, single: singleMock }));
const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock }));

vi.mock('../db/supabase.js', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock
  }
}));

const pointsModule = await import('./pointsService.js');

const battle: BattleDetail = {
  id: 'battle-1',
  player_a_id: 'user-a',
  player_b_id: 'user-b',
  problem_id: 'problem-1',
  winner_id: null,
  status: 'active',
  result: 'pending',
  started_at: null,
  ended_at: null,
  war_id: null,
  created_at: '2026-07-20T00:00:00.000Z',
  is_ai_sparring: false,
  problem: {
    id: 'problem-1',
    title: 'Two Sum',
    description: 'desc',
    difficulty: 'easy',
    category: 'arrays',
    source: 'bank',
    created_at: '2026-07-20T00:00:00.000Z',
    test_cases: []
  },
  player_a: {
    id: 'user-a',
    name: 'Aarav',
    email: 'aarav@example.com',
    college_id: 'college-a',
    points: 20
  },
  player_b: {
    id: 'user-b',
    name: 'Maya',
    email: 'maya@example.com',
    college_id: 'college-b',
    points: 12
  },
  submissions: []
};

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
  selectMock.mockReset();
  selectEqMock.mockReset();
  singleMock.mockReset();
  updateMock.mockReset();
  updateEqMock.mockReset();

  selectEqMock.mockImplementation(() => ({ single: singleMock }));
  updateMock.mockImplementation(() => ({ eq: updateEqMock }));
  selectMock.mockImplementation(() => ({ eq: selectEqMock, single: singleMock }));
  fromMock.mockImplementation(() => ({ select: selectMock, update: updateMock }));
});

describe('points service', () => {
  it('adds college points through the RPC', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await pointsModule.addCollegePoints('college-a', 10);

    expect(rpcMock).toHaveBeenCalledWith('add_college_points', {
      college_uuid: 'college-a',
      points_delta: 10
    });
  });

  it('falls back to a read-then-write flow when add_user_points RPC is unavailable', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'function add_user_points does not exist' } });
    singleMock.mockResolvedValue({ data: { points: 25 }, error: null });
    updateEqMock.mockResolvedValue({ error: null });

    await pointsModule.awardPlayerPoints('user-a', 10);

    expect(rpcMock).toHaveBeenCalledWith('add_user_points', {
      user_uuid: 'user-a',
      points_delta: 10
    });
    expect(fromMock).toHaveBeenCalledWith('users');
    expect(selectMock).toHaveBeenCalledWith('points');
    expect(selectEqMock).toHaveBeenCalledWith('id', 'user-a');
    expect(updateMock).toHaveBeenCalledWith({ points: 35 });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'user-a');
  });

  it('awards player and college points for a standard cross-college battle', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await pointsModule.awardBattleCollegePoints(battle, 'user-a');

    expect(rpcMock).toHaveBeenNthCalledWith(1, 'add_user_points', {
      user_uuid: 'user-a',
      points_delta: 10
    });
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'add_user_points', {
      user_uuid: 'user-b',
      points_delta: 2
    });
    expect(rpcMock).toHaveBeenNthCalledWith(3, 'add_college_points', {
      college_uuid: 'college-a',
      points_delta: 10
    });
    expect(rpcMock).toHaveBeenNthCalledWith(4, 'add_college_points', {
      college_uuid: 'college-b',
      points_delta: 2
    });
  });
});
