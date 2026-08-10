-- Sprint 05.3.6 — Player Attendance Integration
-- Project: «Олімп Футзал»
-- Release: 0.6.0-alpha.8
--
-- Scope:
--   * authenticated player can read only his own RSVP through a self RPC;
--   * authenticated player response is resolved from profile -> membership -> player;
--   * legacy public /training writes move behind a server API;
--   * direct anonymous attendance writes are removed;
--   * authenticated staff keep attendance.mark write access;
--   * existing actual_status / coach_note / marked_at are preserved on RSVP updates;
--   * no attendance data rows are changed by this migration.

begin;

DO $preflight$
declare
  v_duplicate_groups integer;
begin
  if to_regclass('public.training_attendance') is null
     or to_regclass('public.trainings') is null
     or to_regclass('public.players') is null
     or to_regclass('public.team_memberships') is null
     or to_regclass('public.profiles') is null then
    raise exception 'Sprint 05.3.6 attendance foundation tables are missing.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'training_attendance'
      and column_name = 'responded_by_profile_id'
  ) then
    raise exception 'Sprint 05.3.6 requires training_attendance.responded_by_profile_id.';
  end if;

  select count(*)
  into v_duplicate_groups
  from (
    select training_id, player_id
    from public.training_attendance
    where player_id is not null
    group by training_id, player_id
    having count(*) > 1
  ) duplicate_rows;

  if v_duplicate_groups > 0 then
    raise exception
      'Sprint 05.3.6 found % duplicate training_id/player_id attendance groups.',
      v_duplicate_groups;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'training_attendance'
      and indexdef ilike 'create unique index%'
      and indexdef ilike '%training_id%'
      and indexdef ilike '%player_id%'
  ) then
    raise exception
      'Sprint 05.3.6 requires a unique training_attendance(training_id, player_id) constraint/index.';
  end if;
end;
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Self read for the authenticated player
-- ---------------------------------------------------------------------------

create or replace function public.get_my_training_attendance(
  p_training_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_profile_id uuid := auth.uid();
  v_player_id uuid;
  v_team_id uuid;
  v_player_name text;
  v_training_team_id uuid;
  v_record public.training_attendance%rowtype;
begin
  if v_profile_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select
    membership.player_id,
    membership.team_id,
    coalesce(nullif(btrim(player.display_name), ''), player.full_name)
  into
    v_player_id,
    v_team_id,
    v_player_name
  from public.profiles profile
  join public.team_memberships membership
    on membership.profile_id = profile.id
  join public.players player
    on player.id = membership.player_id
  where profile.id = v_profile_id
    and profile.account_status = 'active'
    and membership.status = 'active'
    and membership.archived_at is null
    and membership.valid_from <= current_date
    and (membership.valid_to is null or membership.valid_to >= current_date)
    and player.is_active = true
    and app_private.has_team_permission(
      'attendance.respond_own',
      membership.team_id
    )
  order by membership.created_at
  limit 1;

  if v_player_id is null or v_team_id is null then
    raise exception 'Active player membership required.' using errcode = '42501';
  end if;

  select training.team_id
  into v_training_team_id
  from public.trainings training
  where training.id = p_training_id
    and training.is_active = true
    and training.status = 'scheduled';

  if v_training_team_id is null or v_training_team_id <> v_team_id then
    raise exception 'Training is not available for this player.'
      using errcode = '42501';
  end if;

  select attendance.*
  into v_record
  from public.training_attendance attendance
  where attendance.training_id = p_training_id
    and attendance.player_id = v_player_id
  limit 1;

  return jsonb_build_object(
    'training_id', p_training_id,
    'player_id', v_player_id,
    'player_name', v_player_name,
    'status', case
      when v_record.id is null then null
      else v_record.status
    end,
    'updated_at', case
      when v_record.id is null then null
      else v_record.updated_at
    end
  );
end;
$function$;

revoke all on function public.get_my_training_attendance(uuid) from public;
grant execute on function public.get_my_training_attendance(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Service-only response functions
-- ---------------------------------------------------------------------------

create or replace function public.respond_to_player_training(
  p_profile_id uuid,
  p_training_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player_id uuid;
  v_team_id uuid;
  v_player_name text;
  v_training_team_id uuid;
  v_result public.training_attendance%rowtype;
begin
  if p_profile_id is null then
    raise exception 'Profile is required.' using errcode = '22023';
  end if;

  if p_status not in ('yes', 'no') then
    raise exception 'Player-area status must be yes or no.'
      using errcode = '22023';
  end if;

  select
    membership.player_id,
    membership.team_id,
    coalesce(nullif(btrim(player.display_name), ''), player.full_name)
  into
    v_player_id,
    v_team_id,
    v_player_name
  from public.profiles profile
  join public.team_memberships membership
    on membership.profile_id = profile.id
  join public.players player
    on player.id = membership.player_id
  where profile.id = p_profile_id
    and profile.account_status = 'active'
    and membership.status = 'active'
    and membership.archived_at is null
    and membership.valid_from <= current_date
    and (membership.valid_to is null or membership.valid_to >= current_date)
    and player.is_active = true
  order by membership.created_at
  limit 1;

  if v_player_id is null or v_team_id is null then
    raise exception 'Active player membership required.' using errcode = '42501';
  end if;

  select training.team_id
  into v_training_team_id
  from public.trainings training
  where training.id = p_training_id
    and training.is_active = true
    and training.status = 'scheduled';

  if v_training_team_id is null or v_training_team_id <> v_team_id then
    raise exception 'Training is not available for this player.'
      using errcode = '42501';
  end if;

  insert into public.training_attendance (
    training_id,
    player_id,
    player_name,
    status,
    responded_by_profile_id,
    updated_at
  )
  values (
    p_training_id,
    v_player_id,
    v_player_name,
    p_status,
    p_profile_id,
    now()
  )
  on conflict (training_id, player_id)
  do update set
    player_name = excluded.player_name,
    status = excluded.status,
    responded_by_profile_id = excluded.responded_by_profile_id,
    updated_at = now()
  returning *
  into v_result;

  return jsonb_build_object(
    'training_id', v_result.training_id,
    'player_id', v_result.player_id,
    'player_name', v_result.player_name,
    'status', v_result.status,
    'updated_at', v_result.updated_at
  );
end;
$function$;

create or replace function public.respond_to_training_public(
  p_training_id uuid,
  p_player_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player_name text;
  v_training_team_id uuid;
  v_result public.training_attendance%rowtype;
begin
  if p_status not in ('yes', 'maybe', 'no') then
    raise exception 'Attendance status must be yes, maybe or no.'
      using errcode = '22023';
  end if;

  select training.team_id
  into v_training_team_id
  from public.trainings training
  where training.id = p_training_id
    and training.is_active = true
    and training.status = 'scheduled';

  if v_training_team_id is null then
    raise exception 'Training is not available for responses.'
      using errcode = '42501';
  end if;

  select
    coalesce(nullif(btrim(player.display_name), ''), player.full_name)
  into v_player_name
  from public.players player
  where player.id = p_player_id
    and player.is_active = true
    and exists (
      select 1
      from public.team_memberships membership
      where membership.player_id = player.id
        and membership.team_id = v_training_team_id
        and membership.status = 'active'
        and membership.archived_at is null
        and membership.valid_from <= current_date
        and (membership.valid_to is null or membership.valid_to >= current_date)
    );

  if v_player_name is null then
    raise exception 'Active team player is required.' using errcode = '42501';
  end if;

  insert into public.training_attendance (
    training_id,
    player_id,
    player_name,
    status,
    updated_at
  )
  values (
    p_training_id,
    p_player_id,
    v_player_name,
    p_status,
    now()
  )
  on conflict (training_id, player_id)
  do update set
    player_name = excluded.player_name,
    status = excluded.status,
    updated_at = now()
  returning *
  into v_result;

  return jsonb_build_object(
    'training_id', v_result.training_id,
    'player_id', v_result.player_id,
    'player_name', v_result.player_name,
    'status', v_result.status,
    'updated_at', v_result.updated_at
  );
end;
$function$;

revoke all on function public.respond_to_player_training(uuid, uuid, text)
  from public;
revoke all on function public.respond_to_training_public(uuid, uuid, text)
  from public;

grant execute on function public.respond_to_player_training(uuid, uuid, text)
  to service_role;
grant execute on function public.respond_to_training_public(uuid, uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. Attendance RLS write hardening
-- ---------------------------------------------------------------------------

alter table public.training_attendance enable row level security;

-- Legacy direct browser writes were previously open to anon + authenticated.
-- Writes now go through the environment-safe Next.js API.
drop policy if exists "Public can add attendance"
  on public.training_attendance;
drop policy if exists "Public can update attendance"
  on public.training_attendance;

drop policy if exists "05.3.6 staff attendance insert"
  on public.training_attendance;
drop policy if exists "05.3.6 staff attendance update"
  on public.training_attendance;

-- Admin / coach attendance screens still write directly as authenticated users.
create policy "05.3.6 staff attendance insert"
on public.training_attendance
for insert
to authenticated
with check (
  status in ('yes', 'maybe', 'no', 'no_response')
  and exists (
    select 1
    from public.trainings training
    where training.id = training_id
      and (
        app_private.has_global_permission('attendance.mark')
        or (
          training.team_id is not null
          and app_private.has_team_permission(
            'attendance.mark',
            training.team_id
          )
        )
      )
  )
);

create policy "05.3.6 staff attendance update"
on public.training_attendance
for update
to authenticated
using (
  exists (
    select 1
    from public.trainings training
    where training.id = training_id
      and (
        app_private.has_global_permission('attendance.mark')
        or (
          training.team_id is not null
          and app_private.has_team_permission(
            'attendance.mark',
            training.team_id
          )
        )
      )
  )
)
with check (
  status in ('yes', 'maybe', 'no', 'no_response')
  and exists (
    select 1
    from public.trainings training
    where training.id = training_id
      and (
        app_private.has_global_permission('attendance.mark')
        or (
          training.team_id is not null
          and app_private.has_team_permission(
            'attendance.mark',
            training.team_id
          )
        )
      )
  )
);

-- Keep the existing public SELECT policy unchanged because /training
-- intentionally displays the RSVP list. This sprint hardens writes.

commit;
