-- Sprint 05.3.2 — Account Provisioning preflight
-- READ-ONLY. Run after Sprint 05.3.1 and before provisioning accounts.

select jsonb_build_object(
  'auth_users', (select count(*) from auth.users),
  'profiles', (select count(*) from public.profiles),
  'players', (select count(*) from public.players),
  'player_contacts', (select count(*) from public.player_contacts where is_active),
  'accounts_prepared', (
    select count(*) from public.player_contacts
    where is_active and account_requested and provisioning_status = 'prepared'
  ),
  'accounts_not_requested', (
    select count(*) from public.player_contacts
    where is_active and not account_requested and provisioning_status = 'not_requested'
  ),
  'already_provisioned', (
    select count(*) from public.player_contacts
    where is_active and provisioning_status = 'provisioned'
  ),
  'adult_memberships', (
    select count(*)
    from public.team_memberships membership
    join public.teams team on team.id = membership.team_id and team.code = 'adult'
    join public.roles role on role.id = membership.role_id and role.code = 'player' and role.scope_type = 'team'
    where membership.archived_at is null
  ),
  'active_adult_memberships', (
    select count(*)
    from public.team_memberships membership
    join public.teams team on team.id = membership.team_id and team.code = 'adult'
    join public.roles role on role.id = membership.role_id and role.code = 'player' and role.scope_type = 'team'
    where membership.archived_at is null and membership.status = 'active'
  ),
  'adult_memberships_with_profile', (
    select count(*)
    from public.team_memberships membership
    join public.teams team on team.id = membership.team_id and team.code = 'adult'
    join public.roles role on role.id = membership.role_id and role.code = 'player' and role.scope_type = 'team'
    where membership.archived_at is null and membership.profile_id is not null
  ),
  'unverified_login_contacts', (
    select count(*) from public.player_contacts
    where is_active and account_requested and can_be_used_for_login and not is_verified_by_club
  ),
  'prepared_without_active_membership', (
    select count(*)
    from public.player_contacts contact
    where contact.is_active
      and contact.account_requested
      and contact.provisioning_status = 'prepared'
      and not exists (
        select 1
        from public.team_memberships membership
        join public.teams team on team.id = membership.team_id and team.code = 'adult'
        join public.roles role on role.id = membership.role_id and role.code = 'player' and role.scope_type = 'team'
        where membership.player_id = contact.player_id
          and membership.status = 'active'
          and membership.archived_at is null
      )
  )
) as sprint_05_3_2_preflight;

select
  player.full_name,
  player.is_active as player_is_active,
  membership.status as adult_membership_status,
  contact.account_requested,
  contact.provisioning_status,
  contact.is_verified_by_club,
  contact.can_be_used_for_login
from public.player_contacts contact
join public.players player on player.id = contact.player_id
join public.team_memberships membership on membership.player_id = player.id
join public.teams team on team.id = membership.team_id and team.code = 'adult'
join public.roles role on role.id = membership.role_id and role.code = 'player' and role.scope_type = 'team'
where contact.is_active
order by player.full_name;
