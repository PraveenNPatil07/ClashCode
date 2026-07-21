import type { CreateWarPayload, GeneratedProblemPayload, LoginPayload, ManualCreateBattlePayload, QuickStartBattlePayload, ScheduleWarBattlePayload, SignUpPayload, SubmitBattlePayload } from '../types/api';
import type {
  AuthResponse,
  BattleResponse,
  CollegeLeaderboardResponse,
  CollegesResponse,
  CreateWarResponse,
  CurrentSeasonResponse,
  DashboardResponse,
  HealthResponse,
  ManualCreateBattleResponse,
  QuickStartBattleResponse,
  RunBattleResponse,
  SaveGeneratedProblemResponse,
  StartAiSparringResponse,
  StartBattleResponse,
  StudentLeaderboardResponse,
  SubmitBattleResponse,
  WarResponse
} from '../types/api';


const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchHealth() {
  return request<HealthResponse>('/health');
}

export function fetchColleges() {
  return request<CollegesResponse>('/colleges');
}

export function signUp(payload: SignUpPayload) {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function signIn(payload: LoginPayload) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchDashboard(userId: string) {
  return request<DashboardResponse>(`/users/${userId}/dashboard`);
}

export function fetchBattle(battleId: string) {
  return request<BattleResponse>(`/battles/${battleId}`);
}

export function createQuickBattle(payload: QuickStartBattlePayload) {
  return request<QuickStartBattleResponse>('/battles/quickstart', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function createBattle(payload: ManualCreateBattlePayload) {
  return request<ManualCreateBattleResponse>('/battles', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function startBattle(battleId: string) {
  return request<StartBattleResponse>(`/battles/${battleId}/start`, {
    method: 'POST'
  });
}

export function startAiSparring(battleId: string, userId: string) {
  return request<StartAiSparringResponse>(`/battles/${battleId}/spar`, {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
}

export function submitBattle(battleId: string, payload: SubmitBattlePayload) {
  return request<SubmitBattleResponse>(`/battles/${battleId}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function runBattle(battleId: string, payload: SubmitBattlePayload) {
  return request<RunBattleResponse>(`/battles/${battleId}/run`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function saveGeneratedProblem(payload: GeneratedProblemPayload) {
  return request<SaveGeneratedProblemResponse>('/problems/generate', {
    method: 'POST',
    body: JSON.stringify({ generatedProblem: payload })
  });
}

export function fetchCollegeLeaderboard(limit = 20) {
  return request<CollegeLeaderboardResponse>(`/leaderboard/colleges?limit=${limit}`);
}

export function fetchStudentLeaderboard(limit = 20) {
  return request<StudentLeaderboardResponse>(`/leaderboard/students?limit=${limit}`);
}

export function fetchCurrentSeason() {
  return request<CurrentSeasonResponse>('/seasons/current');
}

export function fetchWar(warId: string) {
  return request<WarResponse>(`/wars/${warId}`);
}

export function createWar(payload: CreateWarPayload) {
  return request<CreateWarResponse>('/wars', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function scheduleWarBattle(warId: string, payload: ScheduleWarBattlePayload) {
  return request<{ battle: unknown }>(`/wars/${warId}/battles`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function closeWar(warId: string) {
  return request<WarResponse>(`/wars/${warId}/close`, {
    method: 'POST'
  });
}

export function fetchBattleDebrief(battleId: string, userId: string) {
  return request<{ debrief: string }>(`/battles/${battleId}/debrief?userId=${userId}`, {
    method: 'GET'
  });
}
