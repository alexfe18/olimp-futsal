-- Sprint 05.3.3 — Player Login & First Sign-in
-- Project: «Олімп Футзал»
-- Release line: 0.6.0-alpha.4
--
-- Scope:
--   * authenticated self-context RPC for routing/access decisions;
--   * first-sign-in completion RPC;
--   * last-seen heartbeat RPC;
--   * no public signup;
--   * no Auth users are created or deleted;
--   * no passwords or private phone values are stored in public tables beyond
--     the already-approved profile snapshot.
--
-- Runtime note:
--   phone + password login requires Phone authentication to be enabled
--   in Supabase Auth Providers.

begin;

create or replace function public.get_my_access_context()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_player_id uuid;
  v_player_name text;
  v_player_is_active boolean;
  v_team_id uuid;
  v_team_code text;
  v_team_name text;
  v_membership_status text;
  v_global_roles text[] := array[]::text[];
  v_team_roles text[] := array[]::text[];
  v_can_access_admin boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required.'
      using errcode = '28000';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_uid;

  if not found then
    raise exception 'Profile not found for authenticated user.'
      using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct role.code order by role.code), array[]::text[])
  into v_global_roles
  from public.user_roles assignment
  join public.roles role
    on role.id = assignment.role_id
   and role.scope_type = 'global'
   and role.is_active
  where assignment.profile_id = v_uid
    and assignment.is_active
    and assignment.valid_from <= now()
    and (assignment.valid_to is null or assignment.valid_to > now());

  -- Resolve the primary adult-team membership first.
  -- IMPORTANT: keep this separate from role aggregation. The original 05.3.3
  -- implementation grouped role rows and then tried to ORDER BY
  -- membership.is_primary / membership.created_at, which PostgreSQL rejects at
  -- runtime because those expressions are not grouped or aggregated.
  select
    membership.player_id,
    player.full_name,
    player.is_active,
    team.id,
    team.code,
    team.name,
    membership.status
  into
    v_player_id,
    v_player_name,
    v_player_is_active,
    v_team_id,
    v_team_code,
    v_team_name,
    v_membership_status
  from public.team_memberships membership
  join public.teams team
    on team.id = membership.team_id
   and team.code = 'adult'
   and team.status = 'active'
  left join public.players player
    on player.id = membership.player_id
  where membership.profile_id = v_uid
    and membership.archived_at is null
    and membership.status in ('active', 'inactive')
    and membership.valid_from <= current_date
    and (membership.valid_to is null or membership.valid_to >= current_date)
  order by
    case when membership.is_primary then 0 else 1 end,
    membership.created_at,
    membership.id
  limit 1;

  -- Aggregate all active team access roles for the resolved team separately.
  if v_team_id is not null then
    select coalesce(
      array_agg(distinct role.code order by role.code),
      array[]::text[]
    )
    into v_team_roles
    from public.team_memberships membership
    join public.roles role
      on role.id = membership.role_id
     and role.scope_type = 'team'
     and role.is_active
    where membership.profile_id = v_uid
      and membership.team_id = v_team_id
      and membership.archived_at is null
      and membership.status in ('active', 'inactive')
      and membership.valid_from <= current_date
      and (membership.valid_to is null or membership.valid_to >= current_date);
  else
    v_team_roles := array[]::text[];
  end if;

  v_can_access_admin :=
    v_global_roles && array['owner', 'administrator', 'club_manager', 'content_manager', 'statistician']::text[]
    or v_team_roles && array[
      'head_coach',
      'assistant_coach',
      'team_manager'
    ]::text[];

  return jsonb_build_object(
    'profile_id', v_profile.id,
    'display_name', v_profile.display_name,
    'account_status', v_profile.account_status,
    'must_change_password', v_profile.must_change_password,
    'locale', v_profile.locale,
    'last_seen_at', v_profile.last_seen_at,
    'global_roles', to_jsonb(v_global_roles),
    'team_roles', to_jsonb(v_team_roles),
    'can_access_admin', v_can_access_admin,
    'player', case
      when v_player_id is null then null
      else jsonb_build_object(
        'id', v_player_id,
        'full_name', v_player_name,
        'sporting_is_active', v_player_is_active
      )
    end,
    'team', case
      when v_team_id is null then null
      else jsonb_build_object(
        'id', v_team_id,
        'code', v_team_code,
        'name', v_team_name,
        'membership_status', v_membership_status
      )
    end
  );
end;
$function$;

revoke all on function public.get_my_access_context() from public;
grant execute on function public.get_my_access_context() to authenticated;


create or replace function public.record_my_login()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_seen_at timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required.'
      using errcode = '28000';
  end if;

  update public.profiles
  set last_seen_at = v_seen_at,
      updated_at = now()
  where id = v_uid
    and account_status = 'active';

  if not found then
    raise exception 'Active profile not found.'
      using errcode = 'P0001';
  end if;

  return v_seen_at;
end;
$function$;

revoke all on function public.record_my_login() from public;
grant execute on function public.record_my_login() to authenticated;


create or replace function public.complete_first_sign_in()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_before boolean;
  v_display_name text;
begin
  if v_uid is null then
    raise exception 'Authentication required.'
      using errcode = '28000';
  end if;

  select must_change_password, display_name
  into v_before, v_display_name
  from public.profiles
  where id = v_uid
    and account_status = 'active'
  for update;

  if not found then
    raise exception 'Active profile not found.'
      using errcode = 'P0001';
  end if;

  update public.profiles
  set must_change_password = false,
      last_seen_at = now(),
      updated_at = now()
  where id = v_uid;

  if v_before then
    insert into public.audit_log (
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      after_data
    )
    values (
      v_uid,
      'auth.first_sign_in_completed',
      'profile',
      v_uid::text,
      jsonb_build_object(
        'must_change_password', false,
        'display_name', v_display_name
      )
    );
  end if;

  return jsonb_build_object(
    'profile_id', v_uid,
    'must_change_password', false,
    'completed_now', v_before
  );
end;
$function$;

revoke all on function public.complete_first_sign_in() from public;
grant execute on function public.complete_first_sign_in() to authenticated;

commit;
