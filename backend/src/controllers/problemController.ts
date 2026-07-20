import type { Request, Response } from 'express';
import type { ProblemDifficulty, ProblemTestCase } from '@clashcode/shared';

import { createProblemRecord } from '../models/problemModel.js';

function isDifficulty(value: string): value is 'easy' | 'medium' | 'hard' {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

type GeneratedProblemPayload = {
  title?: unknown;
  description?: unknown;
  difficulty?: unknown;
  category?: unknown;
  test_cases?: unknown;
};

function sanitizeProblemPayload(payload: GeneratedProblemPayload) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  const difficulty = typeof payload.difficulty === 'string' ? payload.difficulty : '';
  const category = typeof payload.category === 'string' ? payload.category.trim() : '';
  const testCases = payload.test_cases;

  if (!title) {
    throw new Error('title is required.');
  }

  if (!description) {
    throw new Error('description is required.');
  }

  if (!isDifficulty(difficulty)) {
    throw new Error('difficulty must be one of easy, medium, or hard.');
  }

  if (!category) {
    throw new Error('category is required.');
  }

  if (!Array.isArray(testCases) || testCases.length < 4) {
    throw new Error('test_cases must contain at least 4 test cases.');
  }

  const normalizedCases = testCases.map((testCase, index) => {
    if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
      throw new Error(`test_cases[${index}] must be an object.`);
    }

    const input = (testCase as { input?: unknown }).input;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error(`test_cases[${index}].input must be an object.`);
    }

    if (!Object.prototype.hasOwnProperty.call(testCase, 'expected_output')) {
      throw new Error(`test_cases[${index}].expected_output is required.`);
    }

    return {
      input: input as Record<string, unknown>,
      expected_output: (testCase as { expected_output: unknown }).expected_output
    } satisfies ProblemTestCase;
  });

  return {
    title,
    description,
    difficulty: difficulty as ProblemDifficulty,
    category,
    test_cases: normalizedCases,
    source: 'ai_generated' as const
  };
}

export async function generateProblemHandler(request: Request, response: Response): Promise<void> {
  try {
    const payload = (request.body.generatedProblem ?? request.body.problem ?? request.body) as GeneratedProblemPayload;
    const created = await createProblemRecord(sanitizeProblemPayload(payload));
    response.status(201).json({ problem: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while saving generated problem.';
    const status = message.includes('required') || message.includes('must') ? 400 : 500;
    response.status(status).json({ message });
  }
}
