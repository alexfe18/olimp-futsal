-- Sprint 05.3.5 — Player Training Visibility verification
-- READ ONLY.

select jsonb_pretty(
  jsonb_build_object(
    'release', '0.6.0-alpha.6',
    'adult_team', (
      select jsonb_build_object('id', id, 'code', code, 'name', name, 'status', status)
      from public.teams
      where code = 'adult'
      limit 1
    ),
    'trainings', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where is_active),
        'active_scheduled', count(*) filter (where is_active and status = 'scheduled'),
        'without_team_id', count(*) filter (where team_id is null)
      )
      from public.trainings
    ),
    'published_plans', (
      select jsonb_build_object(
        'published', count(*) filter (where status = 'published'),
        'published_with_training', count(*) filter (where status = 'published' and training_id is not null)
      )
      from public.training_plans
    ),
    'policy_checks', jsonb_build_object(
      'legacy_public_trainings_read_removed', not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'trainings'
          and policyname = 'Public can read trainings'
      ),
      'public_active_training_policy_exists', exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'trainings'
          and policyname = '05.3.5 public active training read'
          and cmd = 'SELECT'
      ),
      'authenticated_training_policy_exists', exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'trainings'
          and policyname = '05.3.5 authenticated training read'
          and cmd = 'SELECT'
      ),
      'legacy_public_plan_policies_removed', not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'training_plans'
          and policyname like 'Allow public % training plans'
      ),
      'legacy_public_block_policies_removed', not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'training_plan_blocks'
          and policyname like 'Allow public % training plan blocks'
      ),
      'secured_plan_policy_count', (
        select count(*) from pg_policies
        where schemaname = 'public'
          and tablename = 'training_plans'
          and policyname like '05.3.5 training plans %'
      ),
      'secured_block_policy_count', (
        select count(*) from pg_policies
        where schemaname = 'public'
          and tablename = 'training_plan_blocks'
          and policyname like '05.3.5 training plan blocks %'
      )
    ),
    'current_player_baseline', jsonb_build_object(
      'adult_memberships', (
        select count(*)
        from public.team_memberships membership
        join public.teams team on team.id = membership.team_id
        join public.roles role on role.id = membership.role_id
        where team.code = 'adult'
          and role.code = 'player'
          and membership.status = 'active'
          and membership.archived_at is null
      ),
      'adult_memberships_with_profile', (
        select count(*)
        from public.team_memberships membership
        join public.teams team on team.id = membership.team_id
        join public.roles role on role.id = membership.role_id
        where team.code = 'adult'
          and role.code = 'player'
          and membership.status = 'active'
          and membership.archived_at is null
          and membership.profile_id is not null
      )
    )
  )
) as sprint_05_3_5_verification;
