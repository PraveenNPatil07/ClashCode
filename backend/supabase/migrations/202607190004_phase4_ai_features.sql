alter table public.users
  add column if not exists is_ai_bot boolean not null default false;

alter table public.battles
  alter column player_b_id drop not null,
  drop constraint if exists battles_player_a_id_player_b_id_check,
  add column if not exists is_ai_sparring boolean not null default false,
  add constraint battles_player_distinct_check check (player_b_id is null or player_a_id <> player_b_id);

alter table public.submissions
  add column if not exists ai_review text;

create index if not exists idx_users_is_ai_bot on public.users (is_ai_bot);
create index if not exists idx_battles_is_ai_sparring on public.battles (is_ai_sparring);

create or replace function public.complete_battle_if_unclaimed(
  battle_uuid uuid,
  winner_user_uuid uuid,
  winner_points integer,
  loser_points integer
)
returns table(completed boolean, battle_id uuid, winner_id uuid, result text, ended_at timestamptz)
language plpgsql
set search_path = public
as $$
declare
  battle_record public.battles%rowtype;
  has_ai_bot boolean;
begin
  update public.battles
  set status = 'completed',
      result = 'won',
      winner_id = winner_user_uuid,
      ended_at = timezone('utc', now())
  where public.battles.id = battle_uuid
    and public.battles.status = 'active'
    and public.battles.winner_id is null
    and public.battles.result = 'pending'
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

  select exists(
    select 1
    from public.users
    where public.users.id in (battle_record.player_a_id, battle_record.player_b_id)
      and public.users.is_ai_bot = true
  ) into has_ai_bot;

  if not has_ai_bot then
    update public.users
    set points = points + case
      when public.users.id = winner_user_uuid then winner_points
      when public.users.id = case
        when battle_record.player_a_id = winner_user_uuid then battle_record.player_b_id
        else battle_record.player_a_id
      end then loser_points
      else 0
    end
    where public.users.id in (battle_record.player_a_id, battle_record.player_b_id);
  end if;

  completed := true;
  battle_id := battle_record.id;
  winner_id := battle_record.winner_id;
  result := battle_record.result;
  ended_at := battle_record.ended_at;
  return next;
end;
$$;
