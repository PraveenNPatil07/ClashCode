import type { JudgeExecutionResult, SupportedLanguage } from '@clashcode/shared';

import { env } from '../db/env.js';

const TERMINAL_STATUS_IDS = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
const ACCEPTED_STATUSES = new Set(['Accepted', 'AC']);

type JudgeSubmissionResponse = {
  token: string;
};

type JudgeStatusResponse = {
  stdout: string | null;
  stderr: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  status: {
    id: number;
    description: string;
  };
};

type RustboxResponse = {
  result: {
    verdict: string;
  };
  output: {
    stdout: string | null;
    stderr: string | null;
  };
  metrics: {
    cpu_time_secs: number | null;
    wall_time_secs: number | null;
  };
};

const JUDGE0_LANGUAGE_MAP: Partial<Record<SupportedLanguage, number>> = {
  javascript: 63,
  python: 71
};

const RUSTBOX_LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp'
};

function judgeHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (env.JUDGE0_MODE === 'rapidapi') {
    if (!env.JUDGE0_RAPIDAPI_KEY) {
      throw new Error('Missing JUDGE0_RAPIDAPI_KEY while JUDGE0_MODE=rapidapi.');
    }

    headers['x-rapidapi-key'] = env.JUDGE0_RAPIDAPI_KEY;
    headers['x-rapidapi-host'] = env.JUDGE0_RAPIDAPI_HOST;
  }

  if (env.JUDGE0_MODE === 'rustbox') {
    if (!env.RUSTBOX_API_KEY) {
      throw new Error('Missing RUSTBOX_API_KEY while JUDGE0_MODE=rustbox.');
    }

    headers['x-api-key'] = env.RUSTBOX_API_KEY;
  }

  return headers;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatRustboxTime(metrics: RustboxResponse['metrics']) {
  if (metrics.wall_time_secs !== null && metrics.wall_time_secs !== undefined) {
    return String(metrics.wall_time_secs);
  }

  if (metrics.cpu_time_secs !== null && metrics.cpu_time_secs !== undefined) {
    return String(metrics.cpu_time_secs);
  }

  return null;
}

async function runRustbox(sourceCode: string, language: SupportedLanguage, stdin: string): Promise<JudgeExecutionResult> {
  const response = await fetch(`${env.RUSTBOX_BASE_URL}/submit?wait=true`, {
    method: 'POST',
    headers: judgeHeaders(),
    body: JSON.stringify({
      language: RUSTBOX_LANGUAGE_MAP[language],
      code: sourceCode,
      stdin
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Rustbox submission failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as RustboxResponse;

  return {
    status: payload.result.verdict,
    stdout: payload.output.stdout ?? null,
    stderr: payload.output.stderr ?? null,
    execution_time: formatRustboxTime(payload.metrics)
  };
}

export async function submitToJudge(sourceCode: string, language: SupportedLanguage, stdin: string) {
  const languageId = JUDGE0_LANGUAGE_MAP[language];
  if (!languageId) {
    throw new Error(`Language ${language} is not configured for Judge0 mode.`);
  }

  const response = await fetch(`${env.JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers: judgeHeaders(),
    body: JSON.stringify({
      language_id: languageId,
      source_code: sourceCode,
      stdin
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Judge0 submission failed (${response.status}): ${message}`);
  }

  return (await response.json()) as JudgeSubmissionResponse;
}

export async function pollJudgeResult(token: string): Promise<JudgeExecutionResult> {
  let polls = 0;

  while (polls < env.JUDGE0_MAX_POLLS) {
    const response = await fetch(
      `${env.JUDGE0_BASE_URL}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,compile_output,message,time,status`,
      {
        headers: judgeHeaders()
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Judge0 polling failed (${response.status}): ${message}`);
    }

    const payload = (await response.json()) as JudgeStatusResponse;
    if (TERMINAL_STATUS_IDS.has(payload.status.id)) {
      const stderr = payload.stderr ?? payload.compile_output ?? payload.message ?? null;

      return {
        status: payload.status.description,
        stdout: payload.stdout ?? null,
        stderr,
        execution_time: payload.time ?? null
      };
    }

    polls += 1;
    await sleep(env.JUDGE0_POLL_INTERVAL_MS);
  }

  throw new Error(`Judge0 polling timed out after ${env.JUDGE0_MAX_POLLS} attempts.`);
}

export function isAcceptedStatus(status: string) {
  return ACCEPTED_STATUSES.has(status);
}

export async function runJudge(sourceCode: string, language: SupportedLanguage, stdin: string) {
  if (env.JUDGE0_MODE === 'rustbox') {
    return runRustbox(sourceCode, language, stdin);
  }

  const submission = await submitToJudge(sourceCode, language, stdin);
  return pollJudgeResult(submission.token);
}