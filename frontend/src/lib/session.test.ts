// @vitest-environment jsdom

import type { User } from '@clashcode/shared';
import { describe, expect, it } from 'vitest';

import { clearSession, readSession, saveSession, syncSessionUser } from './session';

const user: User = {
  id: 'user-1',
  name: 'Aarav',
  email: 'aarav@example.com',
  college_id: 'college-1',
  rank_tier: 'gold',
  points: 42,
  role: 'member',
  created_at: '2026-07-20T00:00:00.000Z'
};

describe('session helpers', () => {
  it('reads back the session written to localStorage', () => {
    saveSession({ user });

    expect(readSession()).toEqual({ user });
  });

  it('clears the stored session', () => {
    saveSession({ user });
    clearSession();

    expect(readSession()).toBeNull();
  });

  it('syncs and returns the latest user session payload', () => {
    const nextSession = syncSessionUser({ ...user, points: 57 });

    expect(nextSession.user.points).toBe(57);
    expect(readSession()).toEqual(nextSession);
  });
});
