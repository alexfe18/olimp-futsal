-- Sprint 05.3.6.1 — PROD Attendance Compatibility Hotfix
-- TEMPORARY DB-only compatibility layer for the currently deployed public /training.
-- Permanent follow-up: move /training submit to respond_to_training_public RPC.

begin;

do $guard$
declare
  v_players integer;
  v_attendance integer;
begin
  if not exists (
    select 1 from public.teams
    where id = '03256743-8b8c-4287-93e4-a3f038706f6e'::uuid
      and code = 'adult'
      and name = 'Олімп Футзал'
  ) then
    raise exception 'HOTFIX REFUSED: database does not match known PROD adult team.';
  end if;

  select count(*) into v_players from public.players;
  select count(*) into v_attendance from public.training_attendance;

  if v_players < 10 then
    raise exception 'HOTFIX REFUSED: expected PROD player baseline, found %.', v_players;
  end if;

  if v_attendance < 50 then
    raise exception 'HOTFIX REFUSED: expected PROD attendance baseline, found %.', v_attendance;
  end if;

  if to_regprocedure('public.respond_to_training_public(uuid,uuid,text)') is null then
    raise exception 'HOTFIX REFUSED: public attendance RPC is missing.';
  end if;
end;
$guard$;

grant insert, update on public.training_attendance to anon, authenticated;

drop policy if exists "05.3.6.1 legacy public attendance insert compatibility"
  on public.training_attendance;

create policy "05.3.6.1 legacy public attendance insert compatibility"
on public.training_attendance
for insert
to anon, authenticated
with check (
  status in ('yes', 'maybe', 'no')
  and player_id is not null
  and responded_by_profile_id is null
  and actual_status is null
  and coach_note is null
  and marked_at is null
  and exists (
    select 1
    from public.trainings t
    where t.id = training_attendance.training_id
      and t.is_active = true
      and t.status = 'scheduled'
  )
  and exists (
    select 1
    from public.players p
    where p.id = training_attendance.player_id
      and p.is_active = true
      and (
        lower(btrim(training_attendance.player_name)) = lower(btrim(p.full_name))
        or (
          nullif(btrim(p.display_name), '') is not null
          and lower(btrim(training_attendance.player_name)) = lower(btrim(p.display_name))
        )
      )
  )
);

drop policy if exists "05.3.6.1 legacy public attendance update compatibility"
  on public.training_attendance;

create policy "05.3.6.1 legacy public attendance update compatibility"
on public.training_attendance
for update
to anon, authenticated
using (
  responded_by_profile_id is null
  and actual_status is null
  and coach_note is null
  and marked_at is null
  and exists (
    select 1
    from public.trainings t
    where t.id = training_attendance.training_id
      and t.is_active = true
      and t.status = 'scheduled'
  )
  and exists (
    select 1
    from public.players p
    where p.id = training_attendance.player_id
      and p.is_active = true
  )
)
with check (
  status in ('yes', 'maybe', 'no')
  and player_id is not null
  and responded_by_profile_id is null
  and actual_status is null
  and coach_note is null
  and marked_at is null
  and exists (
    select 1
    from public.trainings t
    where t.id = training_attendance.training_id
      and t.is_active = true
      and t.status = 'scheduled'
  )
  and exists (
    select 1
    from public.players p
    where p.id = training_attendance.player_id
      and p.is_active = true
      and (
        lower(btrim(training_attendance.player_name)) = lower(btrim(p.full_name))
        or (
          nullif(btrim(p.display_name), '') is not null
          and lower(btrim(training_attendance.player_name)) = lower(btrim(p.display_name))
        )
      )
  )
);

notify pgrst, 'reload schema';

commit;

select jsonb_pretty(jsonb_build_object(
  'sprint', '05.3.6.1',
  'target', 'PROD',
  'prod_guard_team', exists (
    select 1 from public.teams
    where id = '03256743-8b8c-4287-93e4-a3f038706f6e'::uuid
      and code = 'adult' and name = 'Олімп Футзал'
  ),
  'active_scheduled_trainings', (
    select count(*) from public.trainings where is_active = true and status = 'scheduled'
  ),
  'attendance_rows', (select count(*) from public.training_attendance),
  'anon_insert_grant', has_table_privilege('anon', 'public.training_attendance', 'INSERT'),
  'anon_update_grant', has_table_privilege('anon', 'public.training_attendance', 'UPDATE'),
  'public_rpc_exists', to_regprocedure('public.respond_to_training_public(uuid,uuid,text)') is not null,
  'hotfix_insert_policy', exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='training_attendance'
      and policyname='05.3.6.1 legacy public attendance insert compatibility'
  ),
  'hotfix_update_policy', exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='training_attendance'
      and policyname='05.3.6.1 legacy public attendance update compatibility'
  ),
  'public_read_policy_preserved', exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='training_attendance'
      and cmd='SELECT' and 'anon'=any(roles)
  )
)) as sprint_05_3_6_1_hotfix_verification;
