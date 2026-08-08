-- Sprint 05.3.2 — Account Provisioning verification
-- READ-ONLY. Run after account provisioning.

select jsonb_build_object(
  'auth_users', (select count(*) from auth.users),
  'profiles', (select count(*) from public.profiles),
  'active_profiles', (select count(*) from public.profiles where account_status = 'active'),
  'player_contacts', (select count(*) from public.player_contacts where is_active),
  'contacts_provisioned', (
    select count(*) from public.player_contacts
    where is_active and provisioning_status = 'provisioned' and provisioned_profile_id is not null
  ),
  'accounts_prepared', (
    select count(*) from public.player_contacts
    where is_active and provisioning_status = 'prepared'
  ),
  'accounts_not_requested', (
    select count(*) from public.player_contacts
    where is_active and not account_requested and provisioning_status = 'not_requested'
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
  'member_role_assignments', (
    select count(*)
    from public.user_roles assignment
    join public.roles role on role.id = assignment.role_id
    where role.code = 'member' and role.scope_type = 'global' and assignment.is_active
  ),
  'provisioned_contacts_without_matching_membership_profile', (
    select count(*)
    from public.player_contacts contact
    where contact.is_active
      and contact.provisioning_status = 'provisioned'
      and not exists (
        select 1
        from public.team_memberships membership
        join public.teams team on team.id = membership.team_id and team.code = 'adult'
        join public.roles role on role.id = membership.role_id and role.code = 'player' and role.scope_type = 'team'
        where membership.player_id = contact.player_id
          and membership.profile_id = contact.provisioned_profile_id
          and membership.status = 'active'
          and membership.archived_at is null
      )
  )
) as sprint_05_3_2_verification;

select
  player.full_name,
  player.is_active as player_is_active,
  membership.status as adult_membership_status,
  profile.account_status,
  profile.must_change_password,
  contact.account_requested,
  contact.provisioning_status,
  contact.provisioned_profile_id
from public.players player
left join public.player_contacts contact on contact.player_id = player.id and contact.is_active
left join public.team_memberships membership on membership.player_id = player.id
left join public.teams team on team.id = membership.team_id and team.code = 'adult'
left join public.roles role on role.id = membership.role_id and role.code = 'player' and role.scope_type = 'team'
left join public.profiles profile on profile.id = contact.provisioned_profile_id
order by player.full_name;
