-- Sprint 05.3.2.3 — Auth Confirmation Sync verification
-- READ-ONLY.

select jsonb_pretty(
  jsonb_build_object(
    'phone_constraint', (
      select pg_get_constraintdef(con.oid, true)
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'public'
        and c.relname = 'profiles'
        and con.conname = 'profiles_phone_check'
      limit 1
    ),
    'account_status_constraint', (
      select pg_get_constraintdef(con.oid, true)
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'public'
        and c.relname = 'profiles'
        and con.conname = 'profiles_account_status_check'
      limit 1
    ),
    'auth_users_custom_triggers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'trigger_name', t.tgname,
          'definition', pg_get_triggerdef(t.oid, true)
        )
        order by t.tgname
      )
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'auth'
        and c.relname = 'users'
        and not t.tgisinternal
        and t.tgname in (
          'on_auth_user_created_create_profile',
          'on_auth_user_confirmed_sync_profile'
        )
    ), '[]'::jsonb),
    'function_definition', (
      select pg_get_functiondef(p.oid)
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
      where ns.nspname = 'app_private'
        and p.proname = 'handle_new_auth_user'
      limit 1
    )
  )
) as sprint_05_3_2_3_verification;
