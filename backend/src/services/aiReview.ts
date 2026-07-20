import type { JudgeExecutionResult, Problem, SubmissionVerdict, SupportedLanguage } from '@clashcode/shared';

import { createChatCompletion } from './openai.js';

function buildMetricsSummary(metrics: JudgeExecutionResult) {
  return JSON.stringify({
    status: metrics.status,
    stdout: metrics.stdout,
    stderr: metrics.stderr,
    execution_time: metrics.execution_time
  });
}

export async function reviewSubmission(
  code: string,
  language: SupportedLanguage,
  problem: Problem,
  verdict: SubmissionVerdict,
  executionMetrics: JudgeExecutionResult
) {
  const systemPrompt = [
    'You are reviewing a competitive programming submission for a live battle.',
    'Write 3 to 4 sentences only.',
    'Explain the likely approach, whether it seems optimal or brute-force, and one specific improvement.',
    'Be direct, technically useful, and avoid fluff.'
  ].join(' ');

  const userPrompt = [
    `Language: ${language}`,
    `Verdict: ${verdict}`,
    `Problem title: ${problem.title}`,
    `Problem description: ${problem.description}`,
    `Execution metrics: ${buildMetricsSummary(executionMetrics)}`,
    'Code:',
    code
  ].join('\n\n');

  const completion = await createChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { maxTokens: 220 }
  );

  return completion.text.trim();
}
