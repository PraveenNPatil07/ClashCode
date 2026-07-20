create extension if not exists "pgcrypto";

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  banner_url text,
  total_points integer not null default 0,
  base_level integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  college_id uuid not null references public.colleges(id) on delete restrict,
  rank_tier text not null default 'bronze' check (rank_tier in ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  points integer not null default 0,
  role text not null default 'member' check (role in ('member', 'officer', 'leader')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  category text not null,
  test_cases jsonb not null default '[]'::jsonb,
  source text not null default 'bank' check (source in ('bank', 'ai_generated')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wars (
  id uuid primary key default gen_random_uuid(),
  college_a_id uuid not null references public.colleges(id) on delete restrict,
  college_b_id uuid not null references public.colleges(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  winner_college_id uuid references public.colleges(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  check (college_a_id <> college_b_id),
  check (end_time > start_time)
);

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references public.users(id) on delete restrict,
  player_b_id uuid not null references public.users(id) on delete restrict,
  problem_id uuid not null references public.problems(id) on delete restrict,
  winner_id uuid references public.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed')),
  started_at timestamptz,
  ended_at timestamptz,
  war_id uuid references public.wars(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (player_a_id <> player_b_id),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  code text not null,
  verdict text not null check (verdict in ('pending', 'correct', 'incorrect', 'error')),
  submitted_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  winner_college_id uuid references public.colleges(id) on delete set null,
  mvp_user_id uuid references public.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'completed')),
  check (end_date > start_date)
);

create index if not exists idx_users_college_id on public.users (college_id);
create index if not exists idx_battles_player_a_id on public.battles (player_a_id);
create index if not exists idx_battles_player_b_id on public.battles (player_b_id);
create index if not exists idx_battles_problem_id on public.battles (problem_id);
create index if not exists idx_battles_war_id on public.battles (war_id);
create index if not exists idx_battles_status on public.battles (status);
create index if not exists idx_submissions_battle_id on public.submissions (battle_id);
create index if not exists idx_submissions_user_id on public.submissions (user_id);
create index if not exists idx_wars_college_a_id on public.wars (college_a_id);
create index if not exists idx_wars_college_b_id on public.wars (college_b_id);
create index if not exists idx_wars_status on public.wars (status);
