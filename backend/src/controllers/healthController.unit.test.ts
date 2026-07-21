import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { getHealth } from './healthController.js';

// Mock Supabase
const mockSelect = vi.fn();
vi.mock('../db/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect
    }))
  }
}));

describe('healthController', () => {
  it('returns 200 connected when DB is up', async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: null });

    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    await getHealth(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        database: 'connected'
      })
    );
  });

  it('returns 503 disconnected when DB throws an error', async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });

    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    await getHealth(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        database: 'disconnected'
      })
    );
  });
});
