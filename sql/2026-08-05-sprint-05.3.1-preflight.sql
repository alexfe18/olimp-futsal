-- Sprint 05.3.1 — Database Foundation preflight
-- READ-ONLY. Run before the foundation migration.

select jsonb_build_object(
  'auth_users', (select count(*) from auth.users),
  'players', (select count(*) from public.players),
  'active_players', (select count(*) from public.players where is_active),
  'inactive_players', (select count(*) from public.players where not is_active),
  'legacy_training_plans_without_team_id_column', not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'training_plans' and column_name = 'team_id'
  ),
  'legacy_trainings_without_team_id_column', not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trainings' and column_name = 'team_id'
  ),
  'adult_team_names', (
    select coalesce(jsonb_agg(item order by item ->> 'source_table'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'source_table', source_table,
        'team_name', team_name,
        'row_count', row_count
      ) as item
      from (
        select 'trainings'::text as source_table, btrim(team_name) as team_name, count(*) as row_count
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
      ) values_by_source
    ) rows_as_json
  )
) as sprint_05_3_1_preflight;

select
  id as auth_user_id,
  email,
  phone,
  created_at,
  email_confirmed_at is not null as email_confirmed,
  phone_confirmed_at is not null as phone_confirmed
from auth.users
order by created_at;

select
  count(*) filter (where player.id is null) as orphan_attendance_rows,
  count(*) as total_attendance_rows
from public.training_attendance attendance
left join public.players player on player.id = attendance.player_id;

select
  count(*) filter (where player.id is null) as orphan_push_subscriptions,
  count(*) as total_push_subscriptions
from public.push_subscriptions subscription
left join public.players player on player.id = subscription.player_id;
