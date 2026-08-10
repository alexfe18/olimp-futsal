-- Sprint 05.3.6 — verification
-- READ-ONLY

select jsonb_pretty(
  jsonb_build_object(
    'release', '0.6.0-alpha.8',
    'attendance', jsonb_build_object(
      'total_rows', (
        select count(*) from public.training_attendance
      ),
      'rows_with_player_id', (
        select count(*)
        from public.training_attendance
        where player_id is not null
      ),
      'rows_with_profile_attribution', (
        select count(*)
        from public.training_attendance
        where responded_by_profile_id is not null
      )
    ),
    'functions', jsonb_build_object(
      'get_my_training_attendance_exists',
        to_regprocedure(
          'public.get_my_training_attendance(uuid)'
        ) is not null,
      'respond_to_player_training_exists',
        to_regprocedure(
          'public.respond_to_player_training(uuid,uuid,text)'
        ) is not null,
      'respond_to_training_public_exists',
        to_regprocedure(
          'public.respond_to_training_public(uuid,uuid,text)'
        ) is not null
    ),
    'policy_checks', jsonb_build_object(
      'legacy_public_insert_removed',
        not exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'training_attendance'
            and policyname = 'Public can add attendance'
        ),
      'legacy_public_update_removed',
        not exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'training_attendance'
            and policyname = 'Public can update attendance'
        ),
      'public_read_preserved',
        exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'training_attendance'
            and policyname = 'Public can read attendance'
            and cmd = 'SELECT'
        ),
      'staff_insert_exists',
        exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'training_attendance'
            and policyname = '05.3.6 staff attendance insert'
            and cmd = 'INSERT'
        ),
      'staff_update_exists',
        exists (
          select 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'training_attendance'
            and policyname = '05.3.6 staff attendance update'
            and cmd = 'UPDATE'
        )
    ),
    'current_training', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', training.id,
            'title', training.title,
            'team_id', training.team_id,
            'starts_at', training.starts_at
          )
          order by training.starts_at
        ),
        '[]'::jsonb
      )
      from public.trainings training
      where training.is_active = true
        and training.status = 'scheduled'
    ),
    'adult_player_baseline', jsonb_build_object(
      'memberships', (
        select count(*)
        from public.team_memberships membership
        join public.teams team on team.id = membership.team_id
        where team.code = 'adult'
          and membership.status = 'active'
          and membership.archived_at is null
      ),
      'memberships_with_profile', (
        select count(*)
        from public.team_memberships membership
        join public.teams team on team.id = membership.team_id
        where team.code = 'adult'
          and membership.status = 'active'
          and membership.archived_at is null
          and membership.profile_id is not null
      )
    )
  )
) as sprint_05_3_6_verification;
