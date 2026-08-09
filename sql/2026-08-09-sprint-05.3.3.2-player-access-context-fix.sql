-- Sprint 05.3.3.2 — Player Access Context runtime fix
-- Project: «Олімп Футзал»
-- Release remains: 0.6.0-alpha.4
--
-- Root cause:
-- The original get_my_access_context() combined role aggregation with GROUP BY
-- and then ordered by membership.is_primary / membership.created_at.
-- PostgreSQL validates that statement on first PL/pgSQL execution and rejects
-- the ungrouped ORDER BY expressions.
--
-- This patch only replaces get_my_access_context().
-- No Auth users, passwords, player contacts, memberships or profile rows are
-- created/deleted/modified by this migration.

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

commit;
