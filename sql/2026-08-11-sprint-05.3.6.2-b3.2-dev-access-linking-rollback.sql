-- Sprint 05.3.6.2 — B.3.2 DEV Access Linking ROLLBACK
-- DEV ONLY.
-- Removes only B.3.2 access/linking rows.
-- Keeps the two B.3.1 Auth users and profiles.

begin;

do $guard$
begin
  if not exists (
    select 1
    from public.teams
    where id = 'a60d27b7-69b4-443f-97bd-40debc306fc5'::uuid
      and code = 'adult'
      and name = 'Олімп Футзал'
  ) then
    raise exception
      'B.3.2 ROLLBACK REFUSED: database does not match known DEV team.';
  end if;
end;
$guard$;

delete from public.team_memberships
where profile_id = (
  select id
  from public.profiles
  where lower(email_snapshot) = 'dev.player@example.com'
)
and notes = 'Synthetic DEV QA membership — Sprint 05.3.6.2 B.3.2';

delete from public.user_roles
where profile_id = (
  select id
  from public.profiles
  where lower(email_snapshot) = 'dev.owner@example.com'
)
and role_id = (
  select id
  from public.roles
  where code = 'owner'
    and scope_type = 'global'
);

delete from public.players
where full_name = 'DEV Player'
  and display_name = 'DEV Player'
  and shirt_number = 99;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'environment', 'DEV',
    'players', (select count(*) from public.players),
    'memberships', (select count(*) from public.team_memberships),
    'user_roles', (select count(*) from public.user_roles),
    'auth_users_preserved', (select count(*) from auth.users),
    'profiles_preserved', (select count(*) from public.profiles)
  )
) as sprint_05_3_6_2_b3_2_rollback_verification;
