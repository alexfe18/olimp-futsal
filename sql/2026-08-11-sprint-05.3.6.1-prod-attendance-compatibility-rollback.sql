-- Sprint 05.3.6.1 — PROD Attendance Compatibility Hotfix ROLLBACK
begin;

do $guard$
begin
  if not exists (
    select 1 from public.teams
    where id = '03256743-8b8c-4287-93e4-a3f038706f6e'::uuid
      and code = 'adult'
      and name = 'Олімп Футзал'
  ) then
    raise exception 'ROLLBACK REFUSED: database does not match known PROD adult team.';
  end if;
end;
$guard$;

drop policy if exists "05.3.6.1 legacy public attendance insert compatibility"
  on public.training_attendance;
drop policy if exists "05.3.6.1 legacy public attendance update compatibility"
  on public.training_attendance;

notify pgrst, 'reload schema';
commit;

select jsonb_pretty(jsonb_build_object(
  'sprint', '05.3.6.1',
  'rollback', true,
  'insert_policy_remaining', exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='training_attendance'
      and policyname='05.3.6.1 legacy public attendance insert compatibility'
  ),
  'update_policy_remaining', exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='training_attendance'
      and policyname='05.3.6.1 legacy public attendance update compatibility'
  ),
  'public_read_policy_preserved', exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='training_attendance'
      and cmd='SELECT' and 'anon'=any(roles)
  )
)) as sprint_05_3_6_1_rollback_verification;
