import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { signUp, signIn } from './authController.js';

vi.mock('../models/userModel.js', () => ({
  createUserProfile: vi.fn(),
  fetchCollegeById: vi.fn(),
  findUserByEmail: vi.fn()
}));

import { createUserProfile, fetchCollegeById, findUserByEmail } from '../models/userModel.js';

describe('authController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  describe('signUp', () => {
    it('returns 400 if fields are missing', async () => {
      req.body = { name: 'Alice' }; // missing email and collegeId

      await signUp(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });

    it('returns 409 if user already exists', async () => {
      req.body = { name: 'Alice', email: 'alice@test.edu', collegeId: 'c1' };
      vi.mocked(findUserByEmail).mockResolvedValueOnce({ id: 'u1' } as any);

      await signUp(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });

    it('returns 201 on success', async () => {
      req.body = { name: 'Alice', email: 'alice@test.edu', collegeId: 'c1' };
      vi.mocked(findUserByEmail).mockResolvedValueOnce(null);
      vi.mocked(fetchCollegeById).mockResolvedValueOnce({ id: 'c1', name: 'Test College' } as any);
      vi.mocked(createUserProfile).mockResolvedValueOnce({ id: 'u1', name: 'Alice' } as any);

      await signUp(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        user: { id: 'u1', name: 'Alice' },
        college: { id: 'c1', name: 'Test College' }
      });
    });
  });

  describe('signIn', () => {
    it('returns 400 if email is missing', async () => {
      await signIn(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });

    it('returns 404 if user not found', async () => {
      req.body = { email: 'unknown@test.edu' };
      vi.mocked(findUserByEmail).mockResolvedValueOnce(null);

      await signIn(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });

    it('returns 200 on success', async () => {
      req.body = { email: 'alice@test.edu' };
      vi.mocked(findUserByEmail).mockResolvedValueOnce({ id: 'u1', college_id: 'c1' } as any);
      vi.mocked(fetchCollegeById).mockResolvedValueOnce({ id: 'c1', name: 'Test College' } as any);

      await signIn(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: { id: 'u1', college_id: 'c1' },
        college: { id: 'c1', name: 'Test College' }
      });
    });
  });
});
