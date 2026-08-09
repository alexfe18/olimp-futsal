-- Sprint 05.3.3.2 — Player Access Context verification
-- READ-ONLY. The transaction-local JWT claim simulation is rolled back.
-- No Auth users or application rows are changed.

begin;

-- Runtime-test one provisioned player profile without exposing the player's
-- phone, password or name in the output.
select set_config(
  'request.jwt.claim.sub',
  (
    select profile.id::text
    from public.profiles profile
    join public.team_memberships membership
      on membership.profile_id = profile.id
     and membership.archived_at is null
    join public.teams team
      on team.id = membership.team_id
     and team.code = 'adult'
    join public.roles role
      on role.id = membership.role_id
     and role.code = 'player'
     and role.scope_type = 'team'
    where profile.account_status = 'active'
      and profile.must_change_password
    order by profile.created_at
    limit 1
  ),
  true
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', current_setting('request.jwt.claim.sub', true),
    'role', 'authenticated'
  )::text,
  true
);

select jsonb_pretty(
  jsonb_build_object(
    'player_context_runtime_pass',
      (public.get_my_access_context() ->> 'profile_id') is not null,
    'team_code',
      public.get_my_access_context() #>> '{team,code}',
    'team_roles',
      public.get_my_access_context() -> 'team_roles',
    'must_change_password',
      (public.get_my_access_context() ->> 'must_change_password')::boolean,
    'can_access_admin',
      (public.get_my_access_context() ->> 'can_access_admin')::boolean
  )
) as sprint_05_3_3_2_player_context_verification;

-- Runtime-test Owner access separately.
select set_config(
  'request.jwt.claim.sub',
  (
    select assignment.profile_id::text
    from public.user_roles assignment
    join public.roles role
      on role.id = assignment.role_id
     and role.code = 'owner'
     and role.scope_type = 'global'
    where assignment.is_active
      and assignment.valid_from <= now()
      and (assignment.valid_to is null or assignment.valid_to > now())
    order by assignment.created_at
    limit 1
  ),
  true
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', current_setting('request.jwt.claim.sub', true),
    'role', 'authenticated'
  )::text,
  true
);

select jsonb_pretty(
  jsonb_build_object(
    'owner_context_runtime_pass',
      (public.get_my_access_context() ->> 'profile_id') is not null,
    'global_roles',
      public.get_my_access_context() -> 'global_roles',
    'can_access_admin',
      (public.get_my_access_context() ->> 'can_access_admin')::boolean
  )
) as sprint_05_3_3_2_owner_context_verification;

rollback;
