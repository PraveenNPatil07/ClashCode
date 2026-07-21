import dotenv from 'dotenv';

import type { ServerEnv } from '../types/env.js';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const judgeMode = process.env.JUDGE0_MODE === 'rapidapi'
  ? 'rapidapi'
  : process.env.JUDGE0_MODE === 'local'
    ? 'local'
    : 'rustbox';

export const env: ServerEnv = {
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  PORT: Number(process.env.PORT ?? 4000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  JUDGE0_MODE: judgeMode,
  JUDGE0_RAPIDAPI_KEY: process.env.JUDGE0_RAPIDAPI_KEY ?? null,
  JUDGE0_RAPIDAPI_HOST: process.env.JUDGE0_RAPIDAPI_HOST ?? 'judge0-ce.p.rapidapi.com',
  JUDGE0_BASE_URL: process.env.JUDGE0_BASE_URL ?? (judgeMode === 'rapidapi' ? 'https://judge0-ce.p.rapidapi.com' : 'http://localhost:2358'),
  JUDGE0_POLL_INTERVAL_MS: Number(process.env.JUDGE0_POLL_INTERVAL_MS ?? 1500),
  JUDGE0_MAX_POLLS: Number(process.env.JUDGE0_MAX_POLLS ?? 20),
  RUSTBOX_API_KEY: process.env.RUSTBOX_API_KEY ?? null,
  RUSTBOX_BASE_URL: process.env.RUSTBOX_BASE_URL ?? 'https://api.rustbox.sh/api',
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? null,
  GROQ_BASE_URL: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
  GROQ_MODEL: process.env.GROQ_MODEL ?? 'llama-3.1-70b-versatile'
};
