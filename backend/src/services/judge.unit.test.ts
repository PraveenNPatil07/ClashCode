import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = {
  JUDGE0_MODE: 'rustbox' as 'local' | 'rapidapi' | 'rustbox',
  JUDGE0_RAPIDAPI_KEY: 'rapid-key',
  JUDGE0_RAPIDAPI_HOST: 'judge0-ce.p.rapidapi.com',
  JUDGE0_BASE_URL: 'http://localhost:2358',
  JUDGE0_POLL_INTERVAL_MS: 1,
  JUDGE0_MAX_POLLS: 2,
  RUSTBOX_API_KEY: 'rustbox-key',
  RUSTBOX_BASE_URL: 'https://api.rustbox.sh/api'
};

vi.mock('../db/env.js', () => ({ env }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const judgeModule = await import('./judge.js');

beforeEach(() => {
  fetchMock.mockReset();
  env.JUDGE0_MODE = 'rustbox';
  env.JUDGE0_BASE_URL = 'http://localhost:2358';
  env.JUDGE0_POLL_INTERVAL_MS = 1;
  env.JUDGE0_MAX_POLLS = 2;
});

describe('judge service', () => {
  it('recognizes accepted statuses across providers', () => {
    expect(judgeModule.isAcceptedStatus('Accepted')).toBe(true);
    expect(judgeModule.isAcceptedStatus('AC')).toBe(true);
    expect(judgeModule.isAcceptedStatus('WA')).toBe(false);
  });

  it('maps a Rustbox response into the shared execution result shape', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { verdict: 'AC' },
        output: { stdout: '7\n', stderr: '' },
        metrics: { cpu_time_secs: 0.01, wall_time_secs: 0.03 }
      })
    });

    const result = await judgeModule.runJudge('print(7)', 'python', '{"a":3,"b":4}');

    expect(fetchMock).toHaveBeenCalledWith('https://api.rustbox.sh/api/submit?wait=true', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'x-api-key': 'rustbox-key'
      })
    }));
    expect(result).toEqual({
      status: 'AC',
      stdout: '7\n',
      stderr: '',
      execution_time: '0.03'
    });
  });

  it('submits and polls Judge0 when not in Rustbox mode', async () => {
    env.JUDGE0_MODE = 'local';

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'submission-token' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stdout: '5\n',
          stderr: null,
          compile_output: null,
          message: null,
          time: '0.02',
          status: {
            id: 3,
            description: 'Accepted'
          }
        })
      });

    const result = await judgeModule.runJudge('print(5)', 'python', '{"value":5}');

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:2358/submissions?base64_encoded=false&wait=false', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:2358/submissions/submission-token?base64_encoded=false&fields=stdout,stderr,compile_output,message,time,status', expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) }));
    expect(result).toEqual({
      status: 'Accepted',
      stdout: '5\n',
      stderr: null,
      execution_time: '0.02'
    });
  });
});
