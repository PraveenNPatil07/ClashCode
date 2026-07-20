import type { Problem } from '@clashcode/shared';

import { createChatCompletion, difficultyGuidance } from './openai.js';

const pendingBotTimers = new Map<string, NodeJS.Timeout>();

function delayRangeForDifficulty(problem: Problem) {
  if (problem.difficulty === 'easy') {
    return { min: 30_000, max: 55_000 };
  }

  if (problem.difficulty === 'medium') {
    return { min: 45_000, max: 75_000 };
  }

  return { min: 60_000, max: 90_000 };
}

export function generateThinkingDelay(problem: Problem) {
  const { min, max } = delayRangeForDifficulty(problem);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function generateBotSolution(problem: Problem) {
  const systemPrompt = [
    'You are writing a correct Python solution for a competitive programming problem.',
    'Return only runnable Python code for stdin/stdout execution.',
    'Do not include markdown fences or explanations.',
    difficultyGuidance(problem.difficulty)
  ].join(' ');

  const userPrompt = [
    `Title: ${problem.title}`,
    `Description: ${problem.description}`,
    'The program will receive one JSON object from stdin and must print only the final answer.',
    'Use Python 3 and make sure the solution handles the edge cases implied by these tests:',
    JSON.stringify(problem.test_cases)
  ].join('\n\n');

  const completion = await createChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { maxTokens: 1400 }
  );

  return completion.text.trim();
}

export function registerBotTimer(battleId: string, timer: NodeJS.Timeout) {
  const existing = pendingBotTimers.get(battleId);
  if (existing) {
    clearTimeout(existing);
  }

  pendingBotTimers.set(battleId, timer);
}

export function clearBotTimer(battleId: string) {
  const timer = pendingBotTimers.get(battleId);
  if (timer) {
    clearTimeout(timer);
    pendingBotTimers.delete(battleId);
  }
}

export function scheduleAiSparringTurn(input: {
  battleId: string;
  botUserId: string;
  problem: Problem;
}) {
  const delayMs = generateThinkingDelay(input.problem);
  const timer = setTimeout(async () => {
    try {
      const [{ fetchBattleDetail }, { processBattleSubmission }] = await Promise.all([
        import('../models/battleModel.js'),
        import('./battleSubmissionService.js')
      ]);

      const latestBattle = await fetchBattleDetail(input.battleId);
      if (!latestBattle || latestBattle.status !== 'active' || !latestBattle.is_ai_sparring) {
        clearBotTimer(input.battleId);
        return;
      }

      const code = await generateBotSolution(input.problem);
      await processBattleSubmission({
        battleId: input.battleId,
        userId: input.botUserId,
        code,
        language: 'python'
      });
    } catch (error) {
      console.error('AI sparring bot submission failed:', error);
    } finally {
      clearBotTimer(input.battleId);
    }
  }, delayMs);

  registerBotTimer(input.battleId, timer);
  return delayMs;
}
