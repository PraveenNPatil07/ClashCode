import type { Battle, BattleDetail, College, HealthCheckResponse, Problem, ProblemDifficulty, ProblemTestCase, Season, Submission, User, War } from '@clashcode/shared';

export interface CollegesResponse {
  colleges: College[];
}

export type HealthResponse = HealthCheckResponse;

export interface BattleResponse {
  battle: BattleDetail;
  durationMs?: number;
  instructions?: {
    stdin: string;
    stdout: string;
  };
}

export interface StartBattleResponse {
  battle: BattleDetail;
  started: boolean;
}

export interface StartAiSparringResponse {
  battle: BattleDetail;
  aiSparring: boolean;
  botDelayMs: number;
}

export interface SubmitBattleResponse {
  battle: BattleDetail | null;
  submission: Submission;
  winnerDeclared: boolean;
}

export interface RunBattleResponse {
  testResults: import('@clashcode/shared').SubmissionTestResult[];
  verdict: 'correct' | 'incorrect' | 'error';
}

export interface SubmitBattlePayload {
  userId: string;
  code: string;
  language: 'python' | 'javascript' | 'java' | 'cpp';
}

export interface AuthResponse {
  user: User;
  college: College | null;
}

export interface DashboardBattleCard {
  id: string;
  status: Battle['status'];
  result: Battle['result'];
  winner_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  war_id?: string | null;
  opponent: {
    id: string;
    name: string;
    points: number;
    rank_tier: string;
  } | null;
  problem: {
    id: string;
    title: string;
    difficulty: string;
    category: string;
  } | null;
}

export interface SuggestedOpponent {
  id: string;
  name: string;
  email: string;
  college_id: string;
  rank_tier: string;
  points: number;
  college_name: string;
}

export interface DashboardResponse {
  user: User;
  college: College | null;
  leaderboard: College[];
  suggestedOpponents: SuggestedOpponent[];
  activeBattles: DashboardBattleCard[];
  recentBattles: DashboardBattleCard[];
}

export interface SignUpPayload {
  name: string;
  email: string;
  collegeId: string;
}

export interface LoginPayload {
  email: string;
}

export interface QuickStartBattlePayload {
  userId: string;
  opponentId?: string;
}

export interface QuickStartBattleResponse {
  battle: BattleDetail;
}

export interface ManualCreateBattlePayload {
  playerAId: string;
  playerBId?: string;
  problemId: string;
}

export interface ManualCreateBattleResponse {
  battle: BattleDetail;
  waitingForOpponent: boolean;
}

export interface CollegeLeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  total_points: number;
  base_level: number;
  wars_won: number;
  battles_won: number;
}

export interface StudentLeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  points: number;
  rank_tier: string;
  college_name: string;
}

export interface CollegeLeaderboardResponse {
  leaderboard: CollegeLeaderboardEntry[];
}

export interface StudentLeaderboardResponse {
  leaderboard: StudentLeaderboardEntry[];
}

export interface CurrentSeasonResponse {
  season: Season;
}

export interface WarBattleView {
  id: string;
  status: Battle['status'];
  result: Battle['result'];
  winner_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  war_id: string | null;
  problem: {
    id: string;
    title: string;
    difficulty: string;
    category: string;
  } | null;
  player_a: { id: string; name: string; college_id: string } | null;
  player_b: { id: string; name: string; college_id: string } | null;
}

export interface WarResponse {
  war: War;
  colleges: {
    collegeA: College | null;
    collegeB: College | null;
    winner: College | null;
  };
  score: {
    collegeAWins: number;
    collegeBWins: number;
  };
  battles: WarBattleView[];
  warBonusAwarded?: number;
  tie?: boolean;
}

export interface CreateWarPayload {
  collegeAId: string;
  collegeBId: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

export interface CreateWarResponse {
  war: War;
}

export interface ScheduleWarBattlePayload {
  playerAId: string;
  playerBId: string;
  problemId: string;
}

export interface GeneratedProblemPayload {
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  category: string;
  test_cases: ProblemTestCase[];
}

export interface SaveGeneratedProblemResponse {
  problem: Problem;
}
