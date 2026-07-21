import type { JudgeExecutionResult, ProblemTestCase, Submission, SubmissionTestResult, SubmissionVerdict, SupportedLanguage } from '@clashcode/shared';

import {
  completeBattleIfUnclaimed,
  fetchBattleDetail,
  insertPendingSubmission,
  updateSubmissionResult
} from '../models/battleModel.js';
import { awardBattleCollegePoints } from './pointsService.js';
import { isAcceptedStatus, runJudge } from './judge.js';
import { reviewSubmission } from './aiReview.js';
import { battleRoom, getSocketServer, warRoom } from './socket.js';
import { clearBotTimer } from './aiSparring.js';

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = normalizeValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function parseProgramOutput(stdout: string | null): unknown {
  if (stdout === null) {
    return null;
  }

  const trimmed = stdout.trim();
  if (!trimmed) {
    return '';
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && trimmed === `${asNumber}`) {
      return asNumber;
    }

    if (trimmed === 'true') {
      return true;
    }

    if (trimmed === 'false') {
      return false;
    }

    return trimmed;
  }
}

function outputsMatch(expected: unknown, actualStdout: string | null) {
  return JSON.stringify(normalizeValue(expected)) === JSON.stringify(normalizeValue(parseProgramOutput(actualStdout)));
}

function emitWarUpdate(warId: string | null, payload: Record<string, unknown>) {
  if (!warId) {
    return;
  }

  getSocketServer().to(warRoom(warId)).emit('war:updated', payload);
}

function buildIncorrectFeedback(testCase: ProblemTestCase, result: JudgeExecutionResult) {
  const expected = JSON.stringify(testCase.expected_output);
  const actual = result.stdout === null ? 'null' : result.stdout.trim() || '""';
  return `Wrong answer on test ${JSON.stringify(testCase.input)}. Expected ${expected}, got ${actual}.`;
}


export async function judgeAgainstProblem(code: string, language: SupportedLanguage, testCases: ProblemTestCase[]) {
  const testResults: SubmissionTestResult[] = [];

  for (let index = 0; index < testCases.length; index += 1) {
    const testCase = testCases[index];
    const result = await runJudge(code, language, JSON.stringify(testCase.input));
    const accepted = isAcceptedStatus(result.status);
    const passed = accepted && outputsMatch(testCase.expected_output, result.stdout);

    testResults.push({
      index,
      status: result.status,
      passed,
      stdout: result.stdout,
      stderr: result.stderr,
      execution_time: result.execution_time
    });

    if (!passed) {
      return {
        verdict: accepted ? ('incorrect' as const) : ('error' as const),
        final: {
          ...result,
          stderr: accepted ? buildIncorrectFeedback(testCase, result) : result.stderr
        },
        testResults
      };
    }
  }

  return {
    verdict: 'correct' as const,
    final: testResults[testResults.length - 1] ?? ({ status: 'AC', stdout: null, stderr: null, execution_time: null } as JudgeExecutionResult),
    testResults
  };
}

export async function processBattleSubmission(input: {
  battleId: string;
  userId: string;
  code: string;
  language: SupportedLanguage;
}) {
  const battle = await fetchBattleDetail(input.battleId);
  if (!battle) {
    throw new Error('Battle not found.');
  }

  const submission = await insertPendingSubmission(input.battleId, input.userId, input.code, input.language);
  getSocketServer().to(battleRoom(input.battleId)).emit('battle:submission_status', {
    battleId: input.battleId,
    submissionId: submission.id,
    userId: input.userId,
    status: 'judging'
  });
  emitWarUpdate(battle.war_id, {
    warId: battle.war_id,
    battleId: input.battleId,
    type: 'submission_received',
    userId: input.userId
  });

  const judged = await judgeAgainstProblem(input.code, input.language, battle.problem.test_cases);

  let aiReview: string | null = null;
  try {
    aiReview = await reviewSubmission(input.code, input.language, battle.problem, judged.verdict as SubmissionVerdict, judged.final);
  } catch (error) {
    aiReview = null;
    console.error('AI review generation failed:', error);
  }

  const updatedSubmission = await updateSubmissionResult(submission.id, {
    verdict: judged.verdict as SubmissionVerdict,
    stdout: judged.final.stdout,
    stderr: judged.final.stderr,
    execution_time: judged.final.execution_time,
    test_results: judged.testResults,
    ai_review: aiReview
  });

  getSocketServer().to(battleRoom(input.battleId)).emit('battle:submission_result', {
    battleId: input.battleId,
    submission: updatedSubmission
  });
  emitWarUpdate(battle.war_id, {
    warId: battle.war_id,
    battleId: input.battleId,
    type: 'submission_result',
    userId: input.userId,
    verdict: updatedSubmission.verdict
  });

  let completed = false;
  if (judged.verdict === 'correct' && battle.status === 'active') {
    const claimed = await completeBattleIfUnclaimed(input.battleId, input.userId);
    completed = claimed.completed;

    if (claimed.completed) {
      const finalBattle = await fetchBattleDetail(input.battleId);
      if (!finalBattle) {
        throw new Error('Battle completed, but the final battle state could not be reloaded.');
      }

      // Award points non-fatally: a points failure must never prevent the
      // battle result from being returned to the client.
      if (!finalBattle.is_ai_sparring) {
        try {
          await awardBattleCollegePoints(finalBattle, input.userId);
          console.log(`[submission] Points awarded for battle ${input.battleId}, winner ${input.userId}`);
        } catch (pointsError) {
          console.error('[submission] Points award failed (battle result unaffected):', pointsError);
        }
      }

      clearBotTimer(input.battleId);
      getSocketServer().to(battleRoom(input.battleId)).emit('battle:completed', {
        battleId: input.battleId,
        result: 'won',
        winnerId: input.userId,
        endedAt: claimed.ended_at,
        battle: finalBattle
      });
      emitWarUpdate(finalBattle.war_id ?? battle.war_id, {
        warId: finalBattle.war_id ?? battle.war_id,
        battleId: input.battleId,
        type: 'battle_completed',
        winnerId: input.userId
      });
    }
  }

  const latestBattle = await fetchBattleDetail(input.battleId);
  return {
    submission: updatedSubmission,
    battle: latestBattle,
    winnerDeclared: completed
  } satisfies {
    submission: Submission;
    battle: Awaited<ReturnType<typeof fetchBattleDetail>>;
    winnerDeclared: boolean;
  };
}
