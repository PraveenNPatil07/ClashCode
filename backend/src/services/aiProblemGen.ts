import type { Problem, ProblemDifficulty, ProblemTestCase } from '@clashcode/shared';

import { createChatCompletion, difficultyGuidance } from './openai.js';

type GeneratedProblem = {
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  category: string;
  test_cases: ProblemTestCase[];
};

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? raw.trim();
}

function validateGeneratedProblem(problem: unknown, expectedDifficulty: ProblemDifficulty, expectedCategory: string): GeneratedProblem {
  if (!problem || typeof problem !== 'object') {
    throw new Error('Generated problem is not an object.');
  }

  const candidate = problem as GeneratedProblem;
  if (!candidate.title?.trim()) {
    throw new Error('Generated problem title is missing.');
  }

  if (!candidate.description?.trim()) {
    throw new Error('Generated problem description is missing.');
  }

  if (candidate.difficulty !== expectedDifficulty) {
    throw new Error(`Generated difficulty ${candidate.difficulty} did not match requested difficulty ${expectedDifficulty}.`);
  }

  if (!candidate.category?.trim()) {
    throw new Error('Generated problem category is missing.');
  }

  if (candidate.category.trim().toLowerCase() !== expectedCategory.trim().toLowerCase()) {
    throw new Error(`Generated category ${candidate.category} did not match requested category ${expectedCategory}.`);
  }

  if (!Array.isArray(candidate.test_cases) || candidate.test_cases.length < 4) {
    throw new Error('Generated problem needs at least 4 test cases.');
  }

  for (const testCase of candidate.test_cases) {
    if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
      throw new Error('A generated test case was malformed (must be an object with input and expected_output).');
    }

    if (testCase.input === undefined || testCase.input === null) {
      throw new Error('A generated test case input must not be null or undefined.');
    }

    if (!Object.prototype.hasOwnProperty.call(testCase, 'expected_output')) {
      throw new Error('A generated test case is missing expected_output.');
    }
  }

  return {
    ...candidate,
    category: expectedCategory.trim(),
    title: candidate.title.trim(),
    description: candidate.description.trim()
  };
}

async function requestProblem(difficulty: ProblemDifficulty, category: string, stricter = false) {
  const systemPrompt = [
    'You create competitive programming problems for a head-to-head coding duel product.',
    'Return only valid JSON matching the required schema.',
    'Never include markdown fences, notes, or commentary.',
    'The problem must be solvable by code execution from structured stdin JSON and testable by exact stdout comparison.',
    difficultyGuidance(difficulty),
    'Include at least 4 test cases, with edge cases that are meaningfully different from the basic cases.',
    stricter ? 'Do not deviate from the exact schema under any circumstance. Output must be parseable JSON and nothing else.' : 'Be concise but precise in the description.'
  ].join(' ');

  const userPrompt = [
    `Generate one ${difficulty} problem in the category "${category}".`,
    'The JSON shape must be exactly:',
    '{ "title": string, "description": string, "difficulty": "easy"|"medium"|"hard", "category": string, "test_cases": [{ "input": object, "expected_output": any }] }',
    'Test case inputs must be realistic JSON inputs for a coding challenge. Expected outputs must be exact values or JSON structures.'
  ].join(' ');

  const completion = await createChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { maxTokens: 2200 }
  );

  return extractJson(completion.text);
}

export async function generateProblem(difficulty: ProblemDifficulty, category: string): Promise<GeneratedProblem> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await requestProblem(difficulty, category, attempt === 1);
      const parsed = JSON.parse(raw);
      return validateGeneratedProblem(parsed, difficulty, category);
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
    }
  }

  throw new Error('Problem generation failed after retry.');
}

export function toAiGeneratedProblem(problem: GeneratedProblem): Omit<Problem, 'id' | 'created_at'> {
  return {
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    category: problem.category,
    test_cases: problem.test_cases,
    source: 'ai_generated'
  };
}
