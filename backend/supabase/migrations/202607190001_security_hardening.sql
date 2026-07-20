alter function public.start_battle_if_waiting(uuid)
  set search_path = public;

alter function public.complete_battle_if_unclaimed(uuid, uuid, integer, integer)
  set search_path = public;

alter function public.mark_battle_draw_if_expired(uuid)
  set search_path = public;

alter table public.colleges enable row level security;
alter table public.users enable row level security;
alter table public.problems enable row level security;
alter table public.wars enable row level security;
alter table public.battles enable row level security;
alter table public.submissions enable row level security;
alter table public.seasons enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'colleges'
      and policyname = 'colleges_read_public'
  ) then
    create policy colleges_read_public
      on public.colleges
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'problems'
      and policyname = 'problems_read_public'
  ) then
    create policy problems_read_public
      on public.problems
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;
