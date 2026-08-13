-- Run in DEV after the B.6.4 migration.
select jsonb_pretty(
  jsonb_build_object(
    'verification', 'Sprint 05.3.6.2 B.6.4 DB Verify',
    'pass',
      to_regprocedure('public.get_training_attendance_board(uuid)') is not null
      and not has_table_privilege('anon', 'public.training_attendance', 'SELECT')
      and not has_table_privilege('anon', 'public.training_attendance', 'INSERT')
      and not has_table_privilege('anon', 'public.training_attendance', 'UPDATE')
      and not has_table_privilege('anon', 'public.training_attendance', 'DELETE')
      and not has_function_privilege('anon', 'public.respond_to_player_training(uuid,uuid,text)', 'EXECUTE')
      and not has_function_privilege('authenticated', 'public.respond_to_player_training(uuid,uuid,text)', 'EXECUTE')
      and not has_function_privilege('anon', 'public.respond_to_training_public(uuid,uuid,text)', 'EXECUTE')
      and has_function_privilege('service_role', 'public.respond_to_player_training(uuid,uuid,text)', 'EXECUTE')
      and has_function_privilege('service_role', 'public.respond_to_training_public(uuid,uuid,text)', 'EXECUTE')
      and has_function_privilege('anon', 'public.get_training_attendance_board(uuid)', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.get_training_attendance_board(uuid)', 'EXECUTE'),
    'board_rpc_exists', to_regprocedure('public.get_training_attendance_board(uuid)') is not null,
    'anon_table_select', has_table_privilege('anon', 'public.training_attendance', 'SELECT'),
    'anon_table_insert', has_table_privilege('anon', 'public.training_attendance', 'INSERT'),
    'anon_table_update', has_table_privilege('anon', 'public.training_attendance', 'UPDATE'),
    'anon_table_delete', has_table_privilege('anon', 'public.training_attendance', 'DELETE'),
    'anon_player_rpc_execute', has_function_privilege('anon', 'public.respond_to_player_training(uuid,uuid,text)', 'EXECUTE'),
    'authenticated_player_rpc_execute', has_function_privilege('authenticated', 'public.respond_to_player_training(uuid,uuid,text)', 'EXECUTE'),
    'anon_legacy_public_rpc_execute', has_function_privilege('anon', 'public.respond_to_training_public(uuid,uuid,text)', 'EXECUTE'),
    'service_role_player_rpc_execute', has_function_privilege('service_role', 'public.respond_to_player_training(uuid,uuid,text)', 'EXECUTE'),
    'service_role_legacy_public_rpc_execute', has_function_privilege('service_role', 'public.respond_to_training_public(uuid,uuid,text)', 'EXECUTE'),
    'anon_board_execute', has_function_privilege('anon', 'public.get_training_attendance_board(uuid)', 'EXECUTE'),
    'authenticated_board_execute', has_function_privilege('authenticated', 'public.get_training_attendance_board(uuid)', 'EXECUTE'),
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'policy', policyname,
        'roles', roles,
        'command', cmd,
        'using', qual
      ) order by policyname), '[]'::jsonb)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'training_attendance'
    )
  )
) as b6_4_db_verify;
