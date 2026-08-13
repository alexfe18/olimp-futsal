-- Sprint 05.3.6.2 — B.3.2 DEV Access Linking
-- DEV ONLY.
--
-- Prerequisites from B.3.1:
--   auth.users = 2
--   profiles = 2
--   dev.owner@example.com -> active
--   dev.player@example.com -> active, must_change_password = true
--
-- Creates:
--   DEV Owner -> global owner role
--   DEV Player -> synthetic player row #99
--   DEV Player -> active primary adult-team membership with team role "player"
--
-- Does NOT create:
--   attendance
--   push subscriptions
--   training rows
--   Twilio/SMS configuration
--   PROD data

begin;

do $b32$
declare
  v_dev_team_id constant uuid := 'a60d27b7-69b4-443f-97bd-40debc306fc5';

  v_owner_profile_id uuid;
  v_player_profile_id uuid;
  v_owner_role_id uuid;
  v_player_role_id uuid;
  v_player_id uuid;

  v_auth_users integer;
  v_profiles integer;
  v_players integer;
  v_memberships integer;
  v_user_roles integer;
begin
  -- Hard environment guard: this UUID belongs to the isolated DEV database.
  if not exists (
    select 1
    from public.teams
    where id = v_dev_team_id
      and code = 'adult'
      and name = 'Олімп Футзал'
      and status = 'active'
  ) then
    raise exception
      'B.3.2 REFUSED: database does not match the known DEV adult team.';
  end if;

  select count(*) into v_auth_users from auth.users;
  select count(*) into v_profiles from public.profiles;
  select count(*) into v_players from public.players;
  select count(*) into v_memberships from public.team_memberships;
  select count(*) into v_user_roles from public.user_roles;

  if v_auth_users <> 2
     or v_profiles <> 2
     or v_players <> 0
     or v_memberships <> 0
     or v_user_roles <> 0 then
    raise exception
      'B.3.2 REFUSED: unexpected DEV identity baseline. auth=%, profiles=%, players=%, memberships=%, user_roles=%',
      v_auth_users, v_profiles, v_players, v_memberships, v_user_roles;
  end if;

  select id
    into strict v_owner_profile_id
  from public.profiles
  where lower(email_snapshot) = 'dev.owner@example.com'
    and account_status = 'active'
    and must_change_password = false;

  select id
    into strict v_player_profile_id
  from public.profiles
  where lower(email_snapshot) = 'dev.player@example.com'
    and account_status = 'active'
    and must_change_password = true;

  select id
    into strict v_owner_role_id
  from public.roles
  where code = 'owner'
    and scope_type = 'global'
    and is_system = true
    and is_active = true;

  select id
    into strict v_player_role_id
  from public.roles
  where code = 'player'
    and scope_type = 'team'
    and is_system = true
    and is_active = true;

  -- Global owner access.
  insert into public.user_roles (
    profile_id,
    role_id,
    assigned_by,
    is_active
  )
  values (
    v_owner_profile_id,
    v_owner_role_id,
    null,
    true
  );

  -- Synthetic DEV-only player card.
  insert into public.players (
    full_name,
    display_name,
    shirt_number,
    position,
    is_active
  )
  values (
    'DEV Player',
    'DEV Player',
    99,
    'Універсал',
    true
  )
  returning id into v_player_id;

  -- Team-scoped player access.
  insert into public.team_memberships (
    team_id,
    profile_id,
    player_id,
    role_id,
    status,
    valid_from,
    valid_to,
    shirt_number,
    is_primary,
    notes
  )
  values (
    v_dev_team_id,
    v_player_profile_id,
    v_player_id,
    v_player_role_id,
    'active',
    current_date,
    null,
    99,
    true,
    'Synthetic DEV QA membership — Sprint 05.3.6.2 B.3.2'
  );
end;
$b32$;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'sprint', '05.3.6.2-B3.2',
    'environment', 'DEV',

    'counts', jsonb_build_object(
      'auth_users', (select count(*) from auth.users),
      'profiles', (select count(*) from public.profiles),
      'players', (select count(*) from public.players),
      'memberships', (select count(*) from public.team_memberships),
      'user_roles', (select count(*) from public.user_roles),
      'attendance_rows', (select count(*) from public.training_attendance),
      'push_subscriptions', (select count(*) from public.push_subscriptions)
    ),

    'owner', (
      select jsonb_build_object(
        'profile_id', p.id,
        'display_name', p.display_name,
        'email', p.email_snapshot,
        'account_status', p.account_status,
        'role', r.code,
        'role_scope', r.scope_type,
        'role_active', ur.is_active
      )
      from public.profiles p
      join public.user_roles ur
        on ur.profile_id = p.id
       and ur.is_active = true
      join public.roles r
        on r.id = ur.role_id
      where lower(p.email_snapshot) = 'dev.owner@example.com'
        and r.code = 'owner'
      limit 1
    ),

    'player', (
      select jsonb_build_object(
        'profile_id', p.id,
        'player_id', pl.id,
        'display_name', p.display_name,
        'email', p.email_snapshot,
        'account_status', p.account_status,
        'must_change_password', p.must_change_password,
        'shirt_number', pl.shirt_number,
        'position', pl.position,
        'team_id', t.id,
        'team_code', t.code,
        'team_name', t.name,
        'team_role', r.code,
        'membership_status', tm.status,
        'is_primary', tm.is_primary
      )
      from public.profiles p
      join public.team_memberships tm
        on tm.profile_id = p.id
      join public.players pl
        on pl.id = tm.player_id
      join public.teams t
        on t.id = tm.team_id
      join public.roles r
        on r.id = tm.role_id
      where lower(p.email_snapshot) = 'dev.player@example.com'
        and r.code = 'player'
      limit 1
    )
  )
) as sprint_05_3_6_2_b3_2_verification;
