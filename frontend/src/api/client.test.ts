import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchHealth, fetchColleges, signUp } from './client';

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchHealth', () => {
    it('returns data when successful', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ database: 'connected' }) };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await fetchHealth();
      expect(result).toEqual({ database: 'connected' });
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.any(Object));
    });

    it('throws an error when not ok', async () => {
      const mockResponse = { ok: false, status: 500, json: vi.fn().mockResolvedValue({ message: 'Server error' }) };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(fetchHealth()).rejects.toThrow('Server error');
    });
  });

  describe('signUp', () => {
    it('posts signup data', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ user: { id: '1' } }) };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const payload = { name: 'Alice', email: 'alice@test.edu', collegeId: 'c1' };
      const result = await signUp(payload);
      
      expect(result).toEqual({ user: { id: '1' } });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/signup'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
    });
  });
});
