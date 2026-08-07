-- Sprint 05.3.1 — Database Foundation verification
-- READ-ONLY. Run after the foundation migration and after optional contact import.

select jsonb_build_object(
  'release', '0.6.0-alpha.2',
  'teams', (select count(*) from public.teams),
  'adult_team_id', (select id from public.teams where code = 'adult'),
  'profiles', (select count(*) from public.profiles),
  'auth_users', (select count(*) from auth.users),
  'players', (select count(*) from public.players),
  'active_players', (select count(*) from public.players where is_active),
  'inactive_players', (select count(*) from public.players where not is_active),
  'active_owners', (
    select count(*)
    from public.user_roles assignment
    join public.roles role on role.id = assignment.role_id and role.code = 'owner'
    join public.profiles profile on profile.id = assignment.profile_id and profile.account_status = 'active'
    where assignment.is_active
      and assignment.valid_from <= now()
      and (assignment.valid_to is null or assignment.valid_to > now())
  ),
  'system_roles', (select count(*) from public.roles where is_system and is_active),
  'permissions', (select count(*) from public.permissions where is_active),
  'adult_roster_memberships', (
    select count(*)
    from public.team_memberships membership
    join public.teams team on team.id = membership.team_id and team.code = 'adult'
    join public.roles role on role.id = membership.role_id and role.code = 'player'
  ),
  'active_adult_roster_memberships', (
    select count(*)
    from public.team_memberships membership
    join public.teams team on team.id = membership.team_id and team.code = 'adult'
    join public.roles role on role.id = membership.role_id and role.code = 'player'
    where membership.status = 'active'
  ),
  'player_contacts', (select count(*) from public.player_contacts where is_active),
  'accounts_prepared', (
    select count(*) from public.player_contacts
    where is_active and account_requested and provisioning_status = 'prepared'
  ),
  'auth_accounts_created_by_contact_import', (
    select count(*) from public.player_contacts where provisioned_profile_id is not null
  ),
  'unmapped_training_plans', (
    select count(*) from public.training_plans
    where team_id is null
      and app_private.resolve_team_id(team_name) = (select id from public.teams where code = 'adult')
  ),
  'unmapped_trainings', (
    select count(*) from public.trainings
    where team_id is null
      and app_private.resolve_team_id(team_name) = (select id from public.teams where code = 'adult')
  ),
  'unmapped_templates', (
    select count(*) from public.training_templates
    where team_id is null
      and app_private.resolve_team_id(team_name) = (select id from public.teams where code = 'adult')
  ),
  'legacy_policies_replaced', false
) as sprint_05_3_1_verification;

select code, name, scope_type, is_system, is_active
from public.roles
order by scope_type, sort_order, code;

select role.code as role_code, role.scope_type, count(role_permission.permission_id) as permission_count
from public.roles role
left join public.role_permissions role_permission on role_permission.role_id = role.id
where role.is_system
group by role.code, role.scope_type, role.sort_order
order by role.scope_type, role.sort_order;

select
  team.code as team_code,
  team.name as team_name,
  membership.status,
  count(*) as membership_count
from public.team_memberships membership
join public.teams team on team.id = membership.team_id
join public.roles role on role.id = membership.role_id and role.code = 'player'
group by team.code, team.name, membership.status
order by team.code, membership.status;

select
  table_name,
  is_insertable_into,
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = table_name) as row_security_enabled
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','teams','roles','permissions','role_permissions','user_roles',
    'team_memberships','player_contacts','guardian_player_links','invitations','audit_log'
  )
order by table_name;

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles','teams','roles','permissions','role_permissions','user_roles',
    'team_memberships','player_contacts','guardian_player_links','invitations','audit_log'
  )
order by tablename, cmd, policyname;

select id, action, entity_type, entity_id, team_id, created_at
from public.audit_log
where action in ('database.foundation_applied', 'player_contacts.foundation_import')
order by created_at desc
limit 10;


-- Sporting availability and access membership are intentionally separate.
select
  player.id,
  player.full_name,
  player.is_active as player_is_active,
  membership.status as adult_membership_status,
  contact.account_requested,
  contact.provisioning_status
from public.players player
join public.teams team on team.code = 'adult'
join public.roles role on role.code = 'player' and role.scope_type = 'team'
left join public.team_memberships membership
  on membership.team_id = team.id
 and membership.player_id = player.id
 and membership.role_id = role.id
left join lateral (
  select account_requested, provisioning_status
  from public.player_contacts player_contact
  where player_contact.player_id = player.id
    and player_contact.is_active
  order by player_contact.is_primary desc, player_contact.updated_at desc
  limit 1
) contact on true
order by player.is_active, player.full_name;
