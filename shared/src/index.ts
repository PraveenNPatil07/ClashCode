export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type UserRole = 'member' | 'officer' | 'leader';
export type ProblemDifficulty = 'easy' | 'medium' | 'hard';
export type ProblemSource = 'bank' | 'ai_generated';
export type BattleStatus = 'waiting' | 'active' | 'completed';
export type BattleResult = 'pending' | 'won' | 'draw';
export type SubmissionVerdict = 'pending' | 'correct' | 'incorrect' | 'error';
export type SupportedLanguage = 'python' | 'javascript' | 'java' | 'cpp';
export type WarStatus = 'scheduled' | 'active' | 'completed';
export type SeasonStatus = 'active' | 'completed';

export interface College {
  id: string;
  name: string;
  banner_url: string | null;
  total_points: number;
  base_level: number;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  college_id: string;
  rank_tier: RankTier;
  points: number;
  role: UserRole;
  created_at: string;
  is_ai_bot?: boolean;
}

export interface ProblemTestCase {
  input: Record<string, unknown>;
  expected_output: unknown;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  category: string;
  test_cases: ProblemTestCase[];
  source: ProblemSource;
  created_at: string;
}

export interface Battle {
  id: string;
  player_a_id: string;
  player_b_id: string | null;
  problem_id: string;
  winner_id: string | null;
  status: BattleStatus;
  result: BattleResult;
  started_at: string | null;
  ended_at: string | null;
  war_id: string | null;
  created_at: string;
  is_ai_sparring: boolean;
}

export interface SubmissionTestResult {
  index: number;
  status: string;
  passed: boolean;
  stdout: string | null;
  stderr: string | null;
  execution_time: string | null;
}

export interface Submission {
  id: string;
  battle_id: string;
  user_id: string;
  code: string;
  language: SupportedLanguage;
  verdict: SubmissionVerdict;
  stdout: string | null;
  stderr: string | null;
  execution_time: string | null;
  test_results: SubmissionTestResult[];
  ai_review: string | null;
  submitted_at: string;
}

export interface BattleParticipant {
  id: string;
  name: string;
  email: string;
  college_id: string;
  points: number;
  is_ai_bot?: boolean;
}

export interface BattleDetail extends Battle {
  problem: Problem;
  player_a: BattleParticipant;
  player_b: BattleParticipant | null;
  submissions: Submission[];
}

export interface War {
  id: string;
  college_a_id: string;
  college_b_id: string;
  start_time: string;
  end_time: string;
  winner_college_id: string | null;
  status: WarStatus;
  created_at: string;
}

export interface Season {
  id: string;
  start_date: string;
  end_date: string;
  winner_college_id: string | null;
  mvp_user_id: string | null;
  status: SeasonStatus;
}

export interface HealthCheckResponse {
  ok: boolean;
  database: 'connected' | 'disconnected';
  checkedAt: string;
}

export interface JudgeExecutionResult {
  status: string;
  stdout: string | null;
  stderr: string | null;
  execution_time: string | null;
}
