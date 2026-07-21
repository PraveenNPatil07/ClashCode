import { beforeEach, describe, expect, it, vi } from 'vitest';

const runJudgeMock = vi.fn();
const isAcceptedStatusMock = vi.fn((status: string) => status === 'AC' || status === 'Accepted');

vi.mock('./judge.js', () => ({
  runJudge: runJudgeMock,
  isAcceptedStatus: isAcceptedStatusMock
}));

vi.mock('../models/battleModel.js', () => ({
  completeBattleIfUnclaimed: vi.fn(),
  fetchBattleDetail: vi.fn(),
  insertPendingSubmission: vi.fn(),
  updateSubmissionResult: vi.fn()
}));

vi.mock('./pointsService.js', () => ({
  awardBattleCollegePoints: vi.fn()
}));

vi.mock('./aiReview.js', () => ({
  reviewSubmission: vi.fn()
}));

vi.mock('./socket.js', () => ({
  battleRoom: vi.fn((battleId: string) => `battle:${battleId}`),
  warRoom: vi.fn((warId: string) => `war:${warId}`),
  getSocketServer: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })) }))
}));

vi.mock('./aiSparring.js', () => ({
  clearBotTimer: vi.fn()
}));

const submissionModule = await import('./battleSubmissionService.js');

beforeEach(() => {
  runJudgeMock.mockReset();
  isAcceptedStatusMock.mockClear();
});

describe('judgeAgainstProblem', () => {
  it('returns correct when every test case passes', async () => {
    runJudgeMock
      .mockResolvedValueOnce({ status: 'AC', stdout: '3', stderr: null, execution_time: '0.01' })
      .mockResolvedValueOnce({ status: 'AC', stdout: '7', stderr: null, execution_time: '0.02' });

    const result = await submissionModule.judgeAgainstProblem('code', 'python', [
      { input: { a: 1, b: 2 }, expected_output: 3 },
      { input: { a: 3, b: 4 }, expected_output: 7 }
    ]);

    expect(result.verdict).toBe('correct');
    expect(result.testResults).toHaveLength(2);
    expect(result.final).toEqual({
      index: 1,
      status: 'AC',
      passed: true,
      stdout: '7',
      stderr: null,
      execution_time: '0.02'
    });
  });

  it('returns incorrect with an expected-vs-got message on the first failing accepted case', async () => {
    runJudgeMock.mockResolvedValue({
      status: 'AC',
      stdout: '4',
      stderr: null,
      execution_time: '0.01'
    });

    const result = await submissionModule.judgeAgainstProblem('code', 'python', [
      { input: { a: 1, b: 2 }, expected_output: 3 }
    ]);

    expect(result.verdict).toBe('incorrect');
    expect(result.final.stderr).toContain('Expected 3, got 4');
    expect(result.testResults[0]).toMatchObject({
      index: 0,
      passed: false,
      status: 'AC'
    });
  });

  it('returns error when the judge status itself is not accepted', async () => {
    runJudgeMock.mockResolvedValue({
      status: 'RE',
      stdout: null,
      stderr: 'Runtime error',
      execution_time: '0.01'
    });

    const result = await submissionModule.judgeAgainstProblem('code', 'python', [
      { input: { n: 5 }, expected_output: 25 }
    ]);

    expect(result.verdict).toBe('error');
    expect(result.final.stderr).toBe('Runtime error');
    expect(result.testResults[0]).toMatchObject({
      passed: false,
      status: 'RE'
    });
  });
});
