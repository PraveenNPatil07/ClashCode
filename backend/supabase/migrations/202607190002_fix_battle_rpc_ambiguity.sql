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

  update public.colleges
  set total_points = total_points + winner_points
  where public.colleges.id = (
    select public.users.college_id
    from public.users
    where public.users.id = winner_user_uuid
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
  where public.battles.id = battle_uuid
    and public.battles.status = 'active'
    and public.battles.winner_id is null
    and public.battles.result = 'pending'
    and public.battles.started_at is not null
    and public.battles.started_at <= timezone('utc', now()) - interval '15 minutes'
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
