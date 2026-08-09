-- Sprint 05.3.3 — Player Login & First Sign-in verification
-- READ-ONLY.

select jsonb_pretty(
  jsonb_build_object(
    'auth_users', (select count(*) from auth.users),
    'profiles', (select count(*) from public.profiles),
    'active_profiles', (
      select count(*) from public.profiles where account_status = 'active'
    ),
    'profiles_requiring_password_change', (
      select count(*) from public.profiles where must_change_password
    ),
    'adult_memberships_with_profile', (
      select count(*)
      from public.team_memberships membership
      join public.teams team on team.id = membership.team_id and team.code = 'adult'
      where membership.profile_id is not null
        and membership.archived_at is null
    ),
    'get_my_access_context_exists', to_regprocedure(
      'public.get_my_access_context()'
    ) is not null,
    'record_my_login_exists', to_regprocedure(
      'public.record_my_login()'
    ) is not null,
    'complete_first_sign_in_exists', to_regprocedure(
      'public.complete_first_sign_in()'
    ) is not null
  )
) as sprint_05_3_3_verification;
