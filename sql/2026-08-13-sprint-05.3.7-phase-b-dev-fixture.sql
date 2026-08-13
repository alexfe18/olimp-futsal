-- Sprint 05.3.7 Phase B DEV-only fixture
-- Creates one upcoming and one completed match for UI/calendar QA.
-- Run only in the isolated DEV Supabase project.

do $fixture$
declare
  v_team_id uuid;
  v_opponent_id uuid;
  v_competition_id uuid;
begin
  select id into v_team_id
  from public.teams
  where code = 'adult' and status = 'active'
  limit 1;

  if v_team_id is null then
    raise exception 'DEV adult team not found.';
  end if;

  select id into v_opponent_id
  from public.opponents
  where name = 'DEV Суперник'
  limit 1;

  if v_opponent_id is null then
    insert into public.opponents (
      name, short_name, city, is_active
    )
    values (
      'DEV Суперник', 'DEV', 'Миколаїв', true
    )
    returning id into v_opponent_id;
  end if;

  select id into v_competition_id
  from public.competitions
  where name = 'DEV Чемпіонат 2026'
    and team_id = v_team_id
  limit 1;

  if v_competition_id is null then
    insert into public.competitions (
      team_id,
      name,
      short_name,
      competition_type,
      season,
      starts_at,
      ends_at,
      is_active,
      notes
    )
    values (
      v_team_id,
      'DEV Чемпіонат 2026',
      'DEV 2026',
      'championship',
      '2026',
      date '2026-08-01',
      date '2026-09-30',
      true,
      'DEV-only Sprint 05.3.7 Phase B fixture'
    )
    returning id into v_competition_id;
  end if;

  if not exists (
    select 1 from public.matches
    where team_id = v_team_id
      and title = 'DEV Матч — майбутній'
  ) then
    insert into public.matches (
      team_id,
      competition_id,
      opponent_id,
      title,
      starts_at,
      location,
      venue_type,
      status,
      round_name,
      is_archived
    )
    values (
      v_team_id,
      v_competition_id,
      v_opponent_id,
      'DEV Матч — майбутній',
      timestamp '2026-08-16 18:00:00' at time zone 'Europe/Kyiv',
      'ФОК Олімп',
      'home',
      'scheduled',
      'DEV тур',
      false
    );
  end if;

  if not exists (
    select 1 from public.matches
    where team_id = v_team_id
      and title = 'DEV Матч — завершений'
  ) then
    insert into public.matches (
      team_id,
      competition_id,
      opponent_id,
      title,
      starts_at,
      location,
      venue_type,
      status,
      round_name,
      olimp_score,
      opponent_score,
      is_archived
    )
    values (
      v_team_id,
      v_competition_id,
      v_opponent_id,
      'DEV Матч — завершений',
      timestamp '2026-08-09 17:00:00' at time zone 'Europe/Kyiv',
      'ФОК Олімп',
      'home',
      'completed',
      'DEV тур',
      4,
      2,
      false
    );
  end if;
end;
$fixture$;

select jsonb_pretty(
  jsonb_build_object(
    'fixture', 'Sprint 05.3.7 Phase B DEV Matches',
    'upcoming',
      (
        select to_jsonb(x)
        from (
          select id, title, starts_at, status, team_id
          from public.matches
          where title = 'DEV Матч — майбутній'
          limit 1
        ) x
      ),
    'completed',
      (
        select to_jsonb(x)
        from (
          select id, title, starts_at, status, olimp_score, opponent_score, team_id
          from public.matches
          where title = 'DEV Матч — завершений'
          limit 1
        ) x
      )
  )
) as phase_b_dev_fixture;
