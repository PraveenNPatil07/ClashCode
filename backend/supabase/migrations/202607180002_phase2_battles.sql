alter table public.battles
  alter column status drop default;

update public.battles
set status = 'waiting'
where status = 'pending';

alter table public.battles
  drop constraint if exists battles_status_check;

alter table public.battles
  add column if not exists result text not null default 'pending',
  alter column status set default 'waiting',
  add constraint battles_status_check check (status in ('waiting', 'active', 'completed')),
  add constraint battles_result_check check (result in ('pending', 'won', 'draw'));

alter table public.submissions
  add column if not exists language text not null default 'python',
  add column if not exists stdout text,
  add column if not exists stderr text,
  add column if not exists execution_time text,
  add column if not exists test_results jsonb not null default '[]'::jsonb;

create or replace function public.start_battle_if_waiting(battle_uuid uuid)
returns table(started boolean, started_at timestamptz)
language plpgsql
as $$
begin
  update public.battles
  set status = 'active',
      started_at = timezone('utc', now())
  where id = battle_uuid
    and status = 'waiting'
  returning true, battles.started_at into started, started_at;

  if found then
    return next;
    return;
  end if;

  started := false;
  started_at := null;
  return next;
end;
$$;

create or replace function public.complete_battle_if_unclaimed(
  battle_uuid uuid,
  winner_user_uuid uuid,
  winner_points integer,
  loser_points integer
)
returns table(completed boolean, battle_id uuid, winner_id uuid, result text, ended_at timestamptz)
language plpgsql
as $$
declare
  battle_record public.battles%rowtype;
begin
  update public.battles
  set status = 'completed',
      result = 'won',
      winner_id = winner_user_uuid,
      ended_at = timezone('utc', now())
  where id = battle_uuid
    and status = 'active'
    and winner_id is null
    and result = 'pending'
  returning * into battle_record;

  if not found then
    completed := false;
    battle_id := battle_uuid;
    winner_id := null;
    result := 'pending';
    ended_at := null;
    return next;
    return;
  end if;

  update public.users
  set points = points + case
    when id = winner_user_uuid then winner_points
    when id = case
      when battle_record.player_a_id = winner_user_uuid then battle_record.player_b_id
      else battle_record.player_a_id
    end then loser_points
    else 0
  end
  where id in (battle_record.player_a_id, battle_record.player_b_id);

  update public.colleges
  set total_points = total_points + winner_points
  where id = (
    select college_id
    from public.users
    where id = winner_user_uuid
  );

  completed := true;
  battle_id := battle_record.id;
  winner_id := battle_record.winner_id;
  result := battle_record.result;
  ended_at := battle_record.ended_at;
  return next;
end;
$$;

create or replace function public.mark_battle_draw_if_expired(battle_uuid uuid)
returns table(completed boolean, battle_id uuid, result text, ended_at timestamptz)
language plpgsql
as $$
declare
  battle_record public.battles%rowtype;
begin
  update public.battles
  set status = 'completed',
      result = 'draw',
      ended_at = timezone('utc', now())
  where id = battle_uuid
    and status = 'active'
    and winner_id is null
    and result = 'pending'
    and started_at is not null
    and started_at <= timezone('utc', now()) - interval '15 minutes'
  returning * into battle_record;

  if not found then
    completed := false;
    battle_id := battle_uuid;
    result := 'pending';
    ended_at := null;
    return next;
    return;
  end if;

  completed := true;
  battle_id := battle_record.id;
  result := battle_record.result;
  ended_at := battle_record.ended_at;
  return next;
end;
$$;