export interface ServerEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PORT: number;
  CLIENT_ORIGIN: string;
  JUDGE0_MODE: 'local' | 'rapidapi' | 'rustbox';
  JUDGE0_RAPIDAPI_KEY: string | null;
  JUDGE0_RAPIDAPI_HOST: string;
  JUDGE0_BASE_URL: string;
  JUDGE0_POLL_INTERVAL_MS: number;
  JUDGE0_MAX_POLLS: number;
  RUSTBOX_API_KEY: string | null;
  RUSTBOX_BASE_URL: string;
  GROQ_API_KEY: string | null;
  GROQ_BASE_URL: string;
  GROQ_MODEL: string;
}
