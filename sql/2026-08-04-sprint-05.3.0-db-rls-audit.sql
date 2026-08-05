-- Sprint 05.3.0 — DB/RLS Audit & Design Freeze
-- READ-ONLY. This script creates no objects and changes no data.
-- Run in Supabase SQL Editor and save/export the result sets.

-- 1. Existing adult-team text values that must be mapped to one canonical team.
select 'trainings' as source_table, btrim(team_name) as legacy_team_name, count(*) as row_count
from public.trainings
where nullif(btrim(team_name), '') is not null
group by btrim(team_name)
union all
select 'training_plans', btrim(team_name), count(*)
from public.training_plans
where nullif(btrim(team_name), '') is not null
group by btrim(team_name)
union all
select 'training_templates', btrim(team_name), count(*)
from public.training_templates
where nullif(btrim(team_name), '') is not null
group by btrim(team_name)
order by source_table, row_count desc, legacy_team_name;

-- 2. Player data quality.
select
  count(*) as total_players,
  count(*) filter (where is_active) as active_players,
  count(*) filter (where not is_active) as inactive_players,
  count(*) filter (where nullif(btrim(full_name), '') is null) as missing_names,
  count(*) filter (where shirt_number is null) as missing_shirt_numbers
from public.players;

select lower(regexp_replace(btrim(full_name), '\\s+', ' ', 'g')) as normalized_name,
       count(*) as duplicate_count,
       array_agg(id order by created_at) as player_ids,
       array_agg(full_name order by created_at) as original_names
from public.players
group by lower(regexp_replace(btrim(full_name), '\\s+', ' ', 'g'))
having count(*) > 1
order by duplicate_count desc, normalized_name;

select shirt_number, count(*) as duplicate_count, array_agg(full_name order by full_name) as players
from public.players
where is_active and shirt_number is not null
group by shirt_number
having count(*) > 1
order by shirt_number;

-- 3. Referential integrity before adding accounts/teams.
select count(*) as orphan_attendance_rows
from public.training_attendance attendance
left join public.players player on player.id = attendance.player_id
where attendance.player_id is not null and player.id is null;

select count(*) as orphan_push_subscriptions
from public.push_subscriptions subscription
left join public.players player on player.id = subscription.player_id
where subscription.player_id is not null and player.id is null;

select count(*) as orphan_plan_training_links
from public.training_plans plan
left join public.trainings training on training.id = plan.training_id
where plan.training_id is not null and training.id is null;

-- 4. Existing Auth state. Only counts are returned; no contact values are exposed.
select
  count(*) as auth_users,
  count(*) filter (where email_confirmed_at is not null) as email_confirmed_users,
  count(*) filter (where phone_confirmed_at is not null) as phone_confirmed_users,
  count(*) filter (where banned_until is not null and banned_until > now()) as currently_banned_users
from auth.users;

-- 5. Current RLS state and broad authenticated policies.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'players', 'trainings', 'training_attendance', 'training_plans',
    'training_plan_blocks', 'training_templates', 'training_template_blocks',
    'push_subscriptions'
  )
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'players', 'trainings', 'training_attendance', 'training_plans',
    'training_plan_blocks', 'training_templates', 'training_template_blocks',
    'push_subscriptions'
  )
order by tablename, cmd, policyname;

-- 6. Grants that must be reviewed before RBAC cutover.
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'players', 'trainings', 'training_attendance', 'training_plans',
    'training_plan_blocks', 'training_templates', 'training_template_blocks',
    'push_subscriptions'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 7. Migration input summary.
select jsonb_build_object(
  'pilot_scope', 'adult_team_only',
  'canonical_team_code_proposal', 'adult',
  'canonical_team_name_proposal', 'Олімп Футзал',
  'youth_teams_in_scope', false,
  'auth_accounts_created_in_05_3_0', false
) as sprint_05_3_0_design_freeze;
