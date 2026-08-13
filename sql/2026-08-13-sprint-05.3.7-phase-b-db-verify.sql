-- Sprint 05.3.7 Phase B DB verification
-- READ ONLY

with expected_policies as (
  select *
  from (
    values
      ('matches', '05.3.7 matches read'),
      ('matches', '05.3.7 matches insert'),
      ('matches', '05.3.7 matches update'),
      ('matches', '05.3.7 matches delete'),
      ('competitions', '05.3.7 competitions read'),
      ('competitions', '05.3.7 competitions insert'),
      ('competitions', '05.3.7 competitions update'),
      ('competitions', '05.3.7 competitions delete'),
      ('opponents', '05.3.7 opponents read'),
      ('opponents', '05.3.7 opponents insert'),
      ('opponents', '05.3.7 opponents update'),
      ('opponents', '05.3.7 opponents delete'),
      ('match_player_stats', '05.3.7 match stats read'),
      ('match_player_stats', '05.3.7 match stats insert'),
      ('match_player_stats', '05.3.7 match stats update'),
      ('match_player_stats', '05.3.7 match stats delete')
  ) as x(table_name, policy_name)
),
policy_check as (
  select
    count(*) = (select count(*) from expected_policies) as ok
  from expected_policies expected
  join pg_policies policy
    on policy.schemaname = 'public'
   and policy.tablename = expected.table_name
   and policy.policyname = expected.policy_name
),
player_permissions as (
  select array_agg(permission.code order by permission.code) as codes
  from public.roles role
  join public.role_permissions rp on rp.role_id = role.id
  join public.permissions permission on permission.id = rp.permission_id
  where role.code = 'player'
    and role.scope_type = 'team'
    and permission.code in ('matches.read', 'competitions.read', 'statistics.read_own')
)
select jsonb_pretty(
  jsonb_build_object(
    'verification', 'Sprint 05.3.7 Phase B DB Verify',
    'pass',
      (
        exists (
          select 1 from information_schema.columns
          where table_schema='public' and table_name='matches' and column_name='team_id'
        )
        and exists (
          select 1 from information_schema.columns
          where table_schema='public' and table_name='competitions' and column_name='team_id'
        )
        and not exists (select 1 from public.matches where team_id is null)
        and not exists (select 1 from public.competitions where team_id is null)
        and (select ok from policy_check)
        and not has_table_privilege('anon', 'public.matches', 'SELECT')
        and not has_table_privilege('anon', 'public.competitions', 'SELECT')
        and not has_table_privilege('anon', 'public.opponents', 'SELECT')
        and not has_table_privilege('anon', 'public.match_player_stats', 'SELECT')
        and not has_table_privilege('authenticated', 'public.matches', 'TRUNCATE')
        and not has_table_privilege('authenticated', 'public.competitions', 'TRUNCATE')
        and not has_table_privilege('authenticated', 'public.opponents', 'TRUNCATE')
        and not has_table_privilege('authenticated', 'public.match_player_stats', 'TRUNCATE')
      ),
    'matches_team_id_exists',
      exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='matches' and column_name='team_id'
      ),
    'competitions_team_id_exists',
      exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='competitions' and column_name='team_id'
      ),
    'unmapped_matches', (select count(*) from public.matches where team_id is null),
    'unmapped_competitions', (select count(*) from public.competitions where team_id is null),
    'expected_policies_present', (select ok from policy_check),
    'anon_matches_select', has_table_privilege('anon', 'public.matches', 'SELECT'),
    'anon_competitions_select', has_table_privilege('anon', 'public.competitions', 'SELECT'),
    'anon_opponents_select', has_table_privilege('anon', 'public.opponents', 'SELECT'),
    'anon_match_stats_select', has_table_privilege('anon', 'public.match_player_stats', 'SELECT'),
    'authenticated_matches_truncate', has_table_privilege('authenticated', 'public.matches', 'TRUNCATE'),
    'authenticated_competitions_truncate', has_table_privilege('authenticated', 'public.competitions', 'TRUNCATE'),
    'authenticated_opponents_truncate', has_table_privilege('authenticated', 'public.opponents', 'TRUNCATE'),
    'authenticated_match_stats_truncate', has_table_privilege('authenticated', 'public.match_player_stats', 'TRUNCATE'),
    'player_role_permissions', coalesce((select to_jsonb(codes) from player_permissions), '[]'::jsonb),
    'matches_count', (select count(*) from public.matches),
    'competitions_count', (select count(*) from public.competitions),
    'opponents_count', (select count(*) from public.opponents)
  )
) as phase_b_db_verify;
