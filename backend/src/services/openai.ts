import type { ProblemDifficulty } from '@clashcode/shared';

import { env } from '../db/env.js';

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export type AiUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export async function createChatCompletion(messages: ChatMessage[], options?: { maxTokens?: number; responseFormat?: Record<string, unknown> }) {
  if (!env.GROQ_API_KEY) {
    throw new Error('Missing GROQ_API_KEY. Add it to backend/.env to enable AI review and sparring.');
  }

  const body: Record<string, unknown> = {
    model: env.GROQ_MODEL,
    messages,
    max_completion_tokens: options?.maxTokens ?? 1200
  };

  if (options?.responseFormat) {
    body.response_format = options.responseFormat;
  }

  const response = await fetch(`${env.GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const choice = payload.choices?.[0]?.message;
  if (!choice?.content) {
    const refusal = choice?.refusal ?? 'No content returned from Groq.';
    throw new Error(refusal);
  }

  return {
    text: choice.content,
    usage: {
      prompt_tokens: payload.usage?.prompt_tokens ?? 0,
      completion_tokens: payload.usage?.completion_tokens ?? 0,
      total_tokens: payload.usage?.total_tokens ?? 0
    } satisfies AiUsage
  };
}

export function difficultyGuidance(difficulty: ProblemDifficulty) {
  if (difficulty === 'easy') {
    return 'Target a straightforward but real interview-style problem solvable in O(n) or O(n log n) time.';
  }

  if (difficulty === 'medium') {
    return 'Target a problem that requires a real insight or data structure choice, but remains solvable in a single focused implementation.';
  }

  return 'Target a genuinely challenging problem that rewards strong algorithmic thinking, careful edge-case handling, and a non-trivial optimal approach.';
}
