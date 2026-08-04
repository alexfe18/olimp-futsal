-- Sprint 05.2.1 — Plan ↔ Training Integration & UX Completion
-- Run after 2026-08-03-training-publish-flow.sql.
--
-- Product contract:
-- - a draft plan does not create a training;
-- - planning creates exactly one inactive training on the selected day;
-- - publication activates that same training instead of creating a duplicate;
-- - organizational fields stay synchronized in both directions;
-- - methodology remains in Training Builder;
-- - existing Push and Attendance use the same linked training UUID.

begin;

alter table public.trainings
  add column if not exists team_name text,
  add column if not exists was_active_before_cancel boolean not null default false;

alter table public.training_plans
  add column if not exists status_before_cancel text;

alter table public.training_plans
  drop constraint if exists training_plans_status_before_cancel_check;

alter table public.training_plans
  add constraint training_plans_status_before_cancel_check
  check (
    status_before_cancel is null
    or status_before_cancel in ('draft', 'planned', 'published', 'in_progress')
  );

update public.trainings as training
set team_name = plan.team_name
from public.training_plans as plan
where plan.training_id = training.id
  and nullif(btrim(training.team_name), '') is null
  and nullif(btrim(plan.team_name), '') is not null;

comment on column public.trainings.team_name is
  'Team assigned to the concrete training event.';
comment on column public.trainings.was_active_before_cancel is
  'Whether the training was player-facing immediately before cancellation.';
comment on column public.training_plans.status_before_cancel is
  'Lifecycle status restored after cancellation when appropriate.';
comment on column public.training_plans.training_id is
  'Unique linked training event created during planning and reused during publication.';
comment on table public.training_plan_events is
  'Lifecycle outbox for Plan ↔ Training synchronization and the existing Push notification flow.';

create or replace function public.save_training_plan_draft_v2(
  p_plan_id uuid,
  p_title text,
  p_session_date date,
  p_session_time time without time zone,
  p_location text,
  p_team_name text,
  p_age_group text,
  p_objective text,
  p_notes text,
  p_intensity text,
  p_status text,
  p_blocks jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan_id uuid;
  v_total_duration integer;
  v_training_id uuid;
  v_starts_at timestamptz;
  v_previous_plan public.training_plans%rowtype;
  v_event_changed boolean := false;
begin
  if nullif(btrim(p_title), '') is null then
    raise exception 'Training plan title is required.' using errcode = '22023';
  end if;

  if p_intensity not in ('low', 'medium', 'high', 'recovery') then
    raise exception 'Unsupported training-plan intensity: %', p_intensity
      using errcode = '22023';
  end if;

  if p_status not in ('draft', 'planned', 'published', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Unsupported training-plan status: %', p_status
      using errcode = '22023';
  end if;

  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'Training plan blocks must be a JSON array.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_blocks) < 1 then
    raise exception 'At least one training block is required.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_blocks) as block(value)
    where jsonb_typeof(block.value) <> 'object'
  ) then
    raise exception 'Every training-plan block must be a JSON object.'
      using errcode = '22023';
  end if;

  select coalesce(
    sum(
      greatest(
        1,
        least(
          300,
          coalesce(nullif(item.value ->> 'duration_minutes', '')::integer, 10)
        )
      )
    ),
    0
  )::integer
  into v_total_duration
  from jsonb_array_elements(p_blocks) as item(value);

  if v_total_duration < 1 then
    raise exception 'Training plan duration must be greater than zero.'
      using errcode = '22023';
  end if;

  if p_status in ('planned', 'published', 'in_progress', 'completed') then
    if p_session_date is null or p_session_time is null then
      raise exception 'Scheduled training requires date and time.'
        using errcode = '22023';
    end if;

    if nullif(btrim(p_location), '') is null then
      raise exception 'Scheduled training requires location.'
        using errcode = '22023';
    end if;

    if nullif(btrim(p_team_name), '') is null then
      raise exception 'Scheduled training requires team.'
        using errcode = '22023';
    end if;
  end if;

  if p_plan_id is null then
    insert into public.training_plans (
      title,
      session_date,
      session_time,
      location,
      team_name,
      age_group,
      objective,
      planned_duration,
      intensity,
      status,
      notes
    ) values (
      btrim(p_title),
      p_session_date,
      p_session_time,
      nullif(btrim(p_location), ''),
      nullif(btrim(p_team_name), ''),
      nullif(btrim(p_age_group), ''),
      nullif(btrim(p_objective), ''),
      v_total_duration,
      p_intensity,
      p_status,
      nullif(btrim(p_notes), '')
    )
    returning id into v_plan_id;
  else
    select * into v_previous_plan
    from public.training_plans
    where id = p_plan_id
    for update;

    if not found then
      raise exception 'Training plan % was not found.', p_plan_id
        using errcode = 'P0002';
    end if;

    v_training_id := v_previous_plan.training_id;
    v_event_changed :=
      v_previous_plan.title is distinct from btrim(p_title)
      or v_previous_plan.session_date is distinct from p_session_date
      or v_previous_plan.session_time is distinct from p_session_time
      or v_previous_plan.location is distinct from nullif(btrim(p_location), '')
      or v_previous_plan.team_name is distinct from nullif(btrim(p_team_name), '');

    update public.training_plans
    set
      title = btrim(p_title),
      session_date = p_session_date,
      session_time = p_session_time,
      location = nullif(btrim(p_location), ''),
      team_name = nullif(btrim(p_team_name), ''),
      age_group = nullif(btrim(p_age_group), ''),
      objective = nullif(btrim(p_objective), ''),
      planned_duration = v_total_duration,
      intensity = p_intensity,
      status = p_status,
      notes = nullif(btrim(p_notes), ''),
      updated_at = now()
    where id = p_plan_id
    returning id into v_plan_id;

    delete from public.training_plan_blocks
    where training_plan_id = v_plan_id;
  end if;

  insert into public.training_plan_blocks (
    training_plan_id,
    exercise_id,
    title,
    description,
    duration_minutes,
    block_type,
    sort_order,
    notes
  )
  select
    v_plan_id,
    nullif(item.value ->> 'exercise_id', '')::uuid,
    coalesce(nullif(btrim(item.value ->> 'title'), ''), 'Вправа'),
    nullif(btrim(item.value ->> 'description'), ''),
    greatest(
      1,
      least(
        300,
        coalesce(nullif(item.value ->> 'duration_minutes', '')::integer, 10)
      )
    ),
    coalesce(nullif(btrim(item.value ->> 'block_type'), ''), 'custom'),
    coalesce(
      nullif(item.value ->> 'sort_order', '')::integer,
      item.ordinality::integer - 1
    ),
    nullif(btrim(item.value ->> 'notes'), '')
  from jsonb_array_elements(p_blocks) with ordinality as item(value, ordinality);

  select coalesce(sum(duration_minutes), 0)::integer
  into v_total_duration
  from public.training_plan_blocks
  where training_plan_id = v_plan_id;

  update public.training_plans
  set planned_duration = v_total_duration, updated_at = now()
  where id = v_plan_id;

  if v_training_id is not null and p_status in ('planned', 'published', 'in_progress') then
    v_starts_at :=
      (p_session_date::timestamp + p_session_time)
      at time zone 'Europe/Kyiv';

    update public.trainings
    set
      title = btrim(p_title),
      starts_at = v_starts_at,
      location = btrim(p_location),
      team_name = btrim(p_team_name),
      is_active = case when p_status = 'planned' then false else is_active end,
      status = 'scheduled',
      cancellation_reason = null,
      was_active_before_cancel = false,
      updated_at = now()
    where id = v_training_id;

    if not found then
      raise exception 'Linked training % was not found.', v_training_id
        using errcode = 'P0002';
    end if;

    if p_status in ('published', 'in_progress') and v_event_changed then
      insert into public.training_plan_events (
        training_plan_id,
        training_id,
        event_type,
        payload,
        created_by
      ) values (
        v_plan_id,
        v_training_id,
        'updated',
        jsonb_build_object(
          'title', btrim(p_title),
          'previous_session_date', v_previous_plan.session_date,
          'previous_session_time', v_previous_plan.session_time,
          'previous_location', v_previous_plan.location,
          'previous_team_name', v_previous_plan.team_name,
          'starts_at', v_starts_at,
          'location', btrim(p_location),
          'team_name', btrim(p_team_name),
          'previous_status', v_previous_plan.status
        ),
        auth.uid()
      );
    end if;
  end if;

  return v_plan_id;
end;
$$;

revoke all on function public.save_training_plan_draft_v2(
  uuid, text, date, time without time zone, text, text, text, text, text, text, text, jsonb
) from public;

grant execute on function public.save_training_plan_draft_v2(
  uuid, text, date, time without time zone, text, text, text, text, text, text, text, jsonb
) to authenticated, service_role;


create or replace function public.sync_training_event_from_plan(p_plan_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan public.training_plans%rowtype;
  v_training public.trainings%rowtype;
  v_training_id uuid;
  v_starts_at timestamptz;
begin
  select * into v_plan
  from public.training_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Training plan % was not found.', p_plan_id using errcode = 'P0002';
  end if;

  if v_plan.status not in ('planned', 'published', 'in_progress') then
    raise exception 'Only planned or published plans can have a linked training.' using errcode = '22023';
  end if;

  if v_plan.session_date is null or v_plan.session_time is null then
    raise exception 'Date and time are required for a linked training.' using errcode = '22023';
  end if;

  if nullif(btrim(v_plan.location), '') is null then
    raise exception 'Location is required for a linked training.' using errcode = '22023';
  end if;

  if nullif(btrim(v_plan.team_name), '') is null then
    raise exception 'Team is required for a linked training.' using errcode = '22023';
  end if;

  v_starts_at :=
    (v_plan.session_date::timestamp + v_plan.session_time)
    at time zone 'Europe/Kyiv';
  v_training_id := v_plan.training_id;

  if v_training_id is null then
    if v_plan.status <> 'planned' then
      raise exception 'Publish the plan to create an active training.' using errcode = '22023';
    end if;

    insert into public.trainings (
      title,
      starts_at,
      location,
      team_name,
      is_active,
      status,
      cancellation_reason,
      was_active_before_cancel
    ) values (
      v_plan.title,
      v_starts_at,
      btrim(v_plan.location),
      btrim(v_plan.team_name),
      false,
      'scheduled',
      null,
      false
    )
    returning id into v_training_id;

    update public.training_plans
    set training_id = v_training_id, updated_at = now()
    where id = p_plan_id;
  else
    select * into v_training
    from public.trainings
    where id = v_training_id
    for update;

    if not found then
      raise exception 'Linked training % was not found.', v_training_id using errcode = 'P0002';
    end if;

    update public.trainings
    set
      title = v_plan.title,
      starts_at = v_starts_at,
      location = btrim(v_plan.location),
      team_name = btrim(v_plan.team_name),
      is_active = case
        when v_plan.status = 'planned' then false
        else is_active
      end,
      status = 'scheduled',
      cancellation_reason = null,
      was_active_before_cancel = false,
      updated_at = now()
    where id = v_training_id;
  end if;

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'training_id', v_training_id,
    'status', v_plan.status,
    'starts_at', v_starts_at,
    'is_active', coalesce(
      (select is_active from public.trainings where id = v_training_id),
      false
    )
  );
end;
$$;

create or replace function public.schedule_training_plan(p_plan_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan public.training_plans%rowtype;
  v_result jsonb;
begin
  select * into v_plan
  from public.training_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Training plan % was not found.', p_plan_id using errcode = 'P0002';
  end if;

  if v_plan.status in ('completed', 'cancelled') then
    raise exception 'Completed or cancelled plan cannot be scheduled.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.training_plan_blocks where training_plan_id = p_plan_id
  ) then
    raise exception 'At least one training block is required before planning.' using errcode = '22023';
  end if;

  update public.training_plans
  set
    status = 'planned',
    unpublished_at = case
      when v_plan.status in ('published', 'in_progress') then now()
      else unpublished_at
    end,
    cancelled_at = null,
    cancellation_reason = null,
    status_before_cancel = null,
    updated_at = now()
  where id = p_plan_id;

  select public.sync_training_event_from_plan(p_plan_id) into v_result;

  update public.trainings
  set
    is_active = false,
    was_active_before_cancel = false,
    updated_at = now()
  where id = (v_result ->> 'training_id')::uuid;

  insert into public.training_plan_events (
    training_plan_id,
    training_id,
    event_type,
    payload,
    created_by,
    processed_at
  ) values (
    p_plan_id,
    (v_result ->> 'training_id')::uuid,
    'updated',
    jsonb_build_object(
      'source', 'training_builder',
      'lifecycle_action', 'planned',
      'title', v_plan.title
    ),
    auth.uid(),
    now()
  );

  return v_result || jsonb_build_object('status', 'planned', 'is_active', false);
end;
$$;

create or replace function public.publish_training_plan(p_plan_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan public.training_plans%rowtype;
  v_training_id uuid;
  v_starts_at timestamptz;
begin
  select * into v_plan
  from public.training_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Training plan % was not found.', p_plan_id using errcode = 'P0002';
  end if;

  if v_plan.status in ('completed', 'cancelled') then
    raise exception 'Completed or cancelled plan cannot be published.' using errcode = '22023';
  end if;

  if v_plan.session_date is null or v_plan.session_time is null then
    raise exception 'Date and time are required before publication.' using errcode = '22023';
  end if;

  if nullif(btrim(v_plan.location), '') is null then
    raise exception 'Location is required before publication.' using errcode = '22023';
  end if;

  if nullif(btrim(v_plan.team_name), '') is null then
    raise exception 'Team is required before publication.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.training_plan_blocks where training_plan_id = p_plan_id
  ) then
    raise exception 'At least one training block is required before publication.' using errcode = '22023';
  end if;

  v_starts_at :=
    (v_plan.session_date::timestamp + v_plan.session_time)
    at time zone 'Europe/Kyiv';
  v_training_id := v_plan.training_id;

  insert into public.training_plan_events (
    training_plan_id, training_id, event_type, payload, created_by, processed_at
  )
  select
    previous_plan.id,
    previous_plan.training_id,
    'unpublished',
    jsonb_build_object(
      'title', previous_plan.title,
      'reason', 'another_training_published'
    ),
    auth.uid(),
    now()
  from public.training_plans as previous_plan
  join public.trainings as previous_training
    on previous_training.id = previous_plan.training_id
  where previous_training.is_active = true
    and (v_training_id is null or previous_training.id <> v_training_id)
    and previous_plan.status in ('published', 'in_progress');

  update public.training_plans as previous_plan
  set
    status = 'planned',
    unpublished_at = now(),
    updated_at = now()
  from public.trainings as previous_training
  where previous_training.id = previous_plan.training_id
    and previous_training.is_active = true
    and (v_training_id is null or previous_training.id <> v_training_id)
    and previous_plan.status in ('published', 'in_progress');

  update public.trainings
  set is_active = false, updated_at = now()
  where is_active = true
    and (v_training_id is null or id <> v_training_id);

  if v_training_id is null then
    insert into public.trainings (
      title,
      starts_at,
      location,
      team_name,
      is_active,
      status,
      cancellation_reason,
      was_active_before_cancel
    ) values (
      v_plan.title,
      v_starts_at,
      btrim(v_plan.location),
      btrim(v_plan.team_name),
      true,
      'scheduled',
      null,
      false
    )
    returning id into v_training_id;
  else
    update public.trainings
    set
      title = v_plan.title,
      starts_at = v_starts_at,
      location = btrim(v_plan.location),
      team_name = btrim(v_plan.team_name),
      is_active = true,
      status = 'scheduled',
      cancellation_reason = null,
      was_active_before_cancel = false,
      updated_at = now()
    where id = v_training_id;

    if not found then
      raise exception 'Linked training % was not found.', v_training_id using errcode = 'P0002';
    end if;
  end if;

  update public.training_plans
  set
    training_id = v_training_id,
    status = 'published',
    published_at = now(),
    published_by = auth.uid(),
    unpublished_at = null,
    cancelled_at = null,
    cancellation_reason = null,
    status_before_cancel = null,
    updated_at = now()
  where id = p_plan_id;

  insert into public.training_plan_events (
    training_plan_id,
    training_id,
    event_type,
    payload,
    created_by
  ) values (
    p_plan_id,
    v_training_id,
    'published',
    jsonb_build_object(
      'title', v_plan.title,
      'starts_at', v_starts_at,
      'location', btrim(v_plan.location),
      'team_name', btrim(v_plan.team_name),
      'planned_duration', v_plan.planned_duration
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'training_id', v_training_id,
    'status', 'published',
    'published_at', now(),
    'starts_at', v_starts_at
  );
end;
$$;

drop function if exists public.update_training_event_with_plan(
  uuid,
  text,
  timestamptz,
  text
);

create or replace function public.update_training_event_with_plan(
  p_training_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_location text,
  p_team_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_training public.trainings%rowtype;
  v_plan public.training_plans%rowtype;
  v_effective_title text;
  v_event_changed boolean := false;
begin
  if p_starts_at is null then
    raise exception 'Training date and time are required.' using errcode = '22023';
  end if;

  if nullif(btrim(p_location), '') is null then
    raise exception 'Training location is required.' using errcode = '22023';
  end if;

  if nullif(btrim(p_team_name), '') is null then
    raise exception 'Training team is required.' using errcode = '22023';
  end if;

  select * into v_training
  from public.trainings
  where id = p_training_id
  for update;

  if not found then
    raise exception 'Training % was not found.', p_training_id using errcode = 'P0002';
  end if;

  select * into v_plan
  from public.training_plans
  where training_id = p_training_id
  for update;

  v_effective_title := case
    when found then v_plan.title
    else nullif(btrim(p_title), '')
  end;

  if v_effective_title is null then
    raise exception 'Training title is required.' using errcode = '22023';
  end if;

  v_event_changed :=
    v_training.title is distinct from v_effective_title
    or v_training.starts_at is distinct from p_starts_at
    or v_training.location is distinct from btrim(p_location)
    or v_training.team_name is distinct from btrim(p_team_name);

  update public.trainings
  set
    title = v_effective_title,
    starts_at = p_starts_at,
    location = btrim(p_location),
    team_name = btrim(p_team_name),
    updated_at = now()
  where id = p_training_id;

  if v_plan.id is not null then
    update public.training_plans
    set
      session_date = (p_starts_at at time zone 'Europe/Kyiv')::date,
      session_time = (p_starts_at at time zone 'Europe/Kyiv')::time,
      location = btrim(p_location),
      team_name = btrim(p_team_name),
      updated_at = now()
    where id = v_plan.id;

    if v_event_changed then
      insert into public.training_plan_events (
        training_plan_id,
        training_id,
        event_type,
        payload,
        created_by,
        processed_at
      ) values (
        v_plan.id,
        p_training_id,
        'updated',
        jsonb_build_object(
          'source', 'training_admin',
          'title', v_effective_title,
          'previous_starts_at', v_training.starts_at,
          'starts_at', p_starts_at,
          'previous_location', v_training.location,
          'location', btrim(p_location),
          'previous_team_name', v_training.team_name,
          'team_name', btrim(p_team_name),
          'is_active', v_training.is_active
        ),
        auth.uid(),
        case when v_training.is_active then null else now() end
      );
    end if;
  end if;

  return jsonb_build_object(
    'training_id', p_training_id,
    'plan_id', v_plan.id,
    'title', v_effective_title,
    'starts_at', p_starts_at,
    'location', btrim(p_location),
    'team_name', btrim(p_team_name),
    'is_active', v_training.is_active,
    'status', v_training.status,
    'notify', v_event_changed and v_training.is_active and v_training.status = 'scheduled'
  );
end;
$$;

create or replace function public.activate_training_with_plan(p_training_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_training public.trainings%rowtype;
  v_plan public.training_plans%rowtype;
begin
  select * into v_training
  from public.trainings
  where id = p_training_id
  for update;

  if not found then
    raise exception 'Training % was not found.', p_training_id using errcode = 'P0002';
  end if;

  if v_training.status <> 'scheduled' then
    raise exception 'Only a scheduled training can be activated.' using errcode = '22023';
  end if;

  insert into public.training_plan_events (
    training_plan_id, training_id, event_type, payload, created_by, processed_at
  )
  select
    previous_plan.id,
    previous_plan.training_id,
    'unpublished',
    jsonb_build_object(
      'title', previous_plan.title,
      'reason', 'another_training_activated_from_training_admin'
    ),
    auth.uid(),
    now()
  from public.training_plans as previous_plan
  join public.trainings as previous_training
    on previous_training.id = previous_plan.training_id
  where previous_training.is_active = true
    and previous_training.id <> p_training_id
    and previous_plan.status in ('published', 'in_progress');

  update public.training_plans as previous_plan
  set
    status = 'planned',
    unpublished_at = now(),
    updated_at = now()
  from public.trainings as previous_training
  where previous_training.id = previous_plan.training_id
    and previous_training.is_active = true
    and previous_training.id <> p_training_id
    and previous_plan.status in ('published', 'in_progress');

  update public.trainings
  set is_active = false, updated_at = now()
  where is_active = true
    and id <> p_training_id;

  update public.trainings
  set
    is_active = true,
    status = 'scheduled',
    cancellation_reason = null,
    was_active_before_cancel = false,
    updated_at = now()
  where id = p_training_id;

  select * into v_plan
  from public.training_plans
  where training_id = p_training_id
  for update;

  if found then
    update public.training_plans
    set
      session_date = (v_training.starts_at at time zone 'Europe/Kyiv')::date,
      session_time = (v_training.starts_at at time zone 'Europe/Kyiv')::time,
      location = v_training.location,
      team_name = coalesce(nullif(btrim(v_training.team_name), ''), team_name),
      status = 'published',
      published_at = now(),
      published_by = auth.uid(),
      unpublished_at = null,
      cancelled_at = null,
      cancellation_reason = null,
      status_before_cancel = null,
      updated_at = now()
    where id = v_plan.id;

    insert into public.training_plan_events (
      training_plan_id, training_id, event_type, payload, created_by
    ) values (
      v_plan.id,
      p_training_id,
      'published',
      jsonb_build_object(
        'source', 'training_admin',
        'title', v_training.title,
        'starts_at', v_training.starts_at,
        'location', v_training.location,
        'team_name', v_training.team_name
      ),
      auth.uid()
    );
  end if;

  return jsonb_build_object(
    'training_id', p_training_id,
    'plan_id', v_plan.id,
    'status', 'scheduled',
    'is_active', true,
    'notify', true
  );
end;
$$;

create or replace function public.deactivate_training_with_plan(p_training_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_training public.trainings%rowtype;
  v_plan public.training_plans%rowtype;
begin
  select * into v_training
  from public.trainings
  where id = p_training_id
  for update;

  if not found then
    raise exception 'Training % was not found.', p_training_id using errcode = 'P0002';
  end if;

  update public.trainings
  set is_active = false, was_active_before_cancel = false, updated_at = now()
  where id = p_training_id;

  select * into v_plan
  from public.training_plans
  where training_id = p_training_id
  for update;

  if found and v_plan.status in ('published', 'in_progress') then
    update public.training_plans
    set
      status = 'planned',
      unpublished_at = now(),
      updated_at = now()
    where id = v_plan.id;

    insert into public.training_plan_events (
      training_plan_id, training_id, event_type, payload, created_by, processed_at
    ) values (
      v_plan.id,
      p_training_id,
      'unpublished',
      jsonb_build_object(
        'source', 'training_admin',
        'title', v_training.title
      ),
      auth.uid(),
      now()
    );
  end if;

  return jsonb_build_object(
    'training_id', p_training_id,
    'plan_id', v_plan.id,
    'status', v_training.status,
    'is_active', false
  );
end;
$$;

create or replace function public.cancel_training_with_plan(
  p_training_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_training public.trainings%rowtype;
  v_plan public.training_plans%rowtype;
  v_reason text;
begin
  v_reason := nullif(btrim(p_reason), '');

  if v_reason is null then
    raise exception 'Cancellation reason is required.' using errcode = '22023';
  end if;

  select * into v_training
  from public.trainings
  where id = p_training_id
  for update;

  if not found then
    raise exception 'Training % was not found.', p_training_id using errcode = 'P0002';
  end if;

  update public.trainings
  set
    status = 'cancelled',
    was_active_before_cancel = v_training.is_active,
    is_active = false,
    cancellation_reason = v_reason,
    updated_at = now()
  where id = p_training_id;

  select * into v_plan
  from public.training_plans
  where training_id = p_training_id
  for update;

  if found then
    update public.training_plans
    set
      status_before_cancel = v_plan.status,
      status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = v_reason,
      updated_at = now()
    where id = v_plan.id;

    insert into public.training_plan_events (
      training_plan_id, training_id, event_type, payload, created_by, processed_at
    ) values (
      v_plan.id,
      p_training_id,
      'cancelled',
      jsonb_build_object(
        'source', 'training_admin',
        'title', v_training.title,
        'reason', v_reason,
        'was_active', v_training.is_active
      ),
      auth.uid(),
      case when v_training.is_active then null else now() end
    );
  end if;

  return jsonb_build_object(
    'training_id', p_training_id,
    'plan_id', v_plan.id,
    'status', 'cancelled',
    'cancellation_reason', v_reason,
    'notify', v_training.is_active
  );
end;
$$;

create or replace function public.restore_training_with_plan(p_training_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_training public.trainings%rowtype;
  v_plan public.training_plans%rowtype;
  v_reactivate boolean;
begin
  select * into v_training
  from public.trainings
  where id = p_training_id
  for update;

  if not found then
    raise exception 'Training % was not found.', p_training_id using errcode = 'P0002';
  end if;

  if v_training.status <> 'cancelled' then
    raise exception 'Only a cancelled training can be restored.' using errcode = '22023';
  end if;

  v_reactivate := v_training.was_active_before_cancel;

  if v_reactivate then
    insert into public.training_plan_events (
      training_plan_id, training_id, event_type, payload, created_by, processed_at
    )
    select
      previous_plan.id,
      previous_plan.training_id,
      'unpublished',
      jsonb_build_object(
        'title', previous_plan.title,
        'reason', 'cancelled_training_restored'
      ),
      auth.uid(),
      now()
    from public.training_plans as previous_plan
    join public.trainings as previous_training
      on previous_training.id = previous_plan.training_id
    where previous_training.is_active = true
      and previous_training.id <> p_training_id
      and previous_plan.status in ('published', 'in_progress');

    update public.training_plans as previous_plan
    set status = 'planned', unpublished_at = now(), updated_at = now()
    from public.trainings as previous_training
    where previous_training.id = previous_plan.training_id
      and previous_training.is_active = true
      and previous_training.id <> p_training_id
      and previous_plan.status in ('published', 'in_progress');

    update public.trainings
    set is_active = false, updated_at = now()
    where is_active = true and id <> p_training_id;
  end if;

  update public.trainings
  set
    status = 'scheduled',
    is_active = v_reactivate,
    was_active_before_cancel = false,
    cancellation_reason = null,
    updated_at = now()
  where id = p_training_id;

  select * into v_plan
  from public.training_plans
  where training_id = p_training_id
  for update;

  if found then
    update public.training_plans
    set
      status = case when v_reactivate then 'published' else 'planned' end,
      published_at = case
        when v_reactivate then coalesce(published_at, now())
        else published_at
      end,
      published_by = case
        when v_reactivate then auth.uid()
        else published_by
      end,
      cancelled_at = null,
      cancellation_reason = null,
      status_before_cancel = null,
      updated_at = now()
    where id = v_plan.id;

    insert into public.training_plan_events (
      training_plan_id, training_id, event_type, payload, created_by, processed_at
    ) values (
      v_plan.id,
      p_training_id,
      'restored',
      jsonb_build_object(
        'source', 'training_admin',
        'title', v_training.title,
        'reactivated', v_reactivate
      ),
      auth.uid(),
      case when v_reactivate then null else now() end
    );
  end if;

  return jsonb_build_object(
    'training_id', p_training_id,
    'plan_id', v_plan.id,
    'status', 'scheduled',
    'is_active', v_reactivate,
    'notify', v_reactivate
  );
end;
$$;

create or replace function public.complete_training_with_plan(p_training_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_training public.trainings%rowtype;
  v_plan public.training_plans%rowtype;
begin
  select * into v_training
  from public.trainings
  where id = p_training_id
  for update;

  if not found then
    raise exception 'Training % was not found.', p_training_id using errcode = 'P0002';
  end if;

  update public.trainings
  set
    status = 'completed',
    is_active = false,
    was_active_before_cancel = false,
    cancellation_reason = null,
    updated_at = now()
  where id = p_training_id;

  select * into v_plan
  from public.training_plans
  where training_id = p_training_id
  for update;

  if found then
    update public.training_plans
    set
      status = 'completed',
      status_before_cancel = null,
      updated_at = now()
    where id = v_plan.id;

    insert into public.training_plan_events (
      training_plan_id, training_id, event_type, payload, created_by, processed_at
    ) values (
      v_plan.id,
      p_training_id,
      'completed',
      jsonb_build_object('source', 'training_admin', 'title', v_training.title),
      auth.uid(),
      now()
    );
  end if;

  return jsonb_build_object(
    'training_id', p_training_id,
    'plan_id', v_plan.id,
    'status', 'completed',
    'is_active', false
  );
end;
$$;

create or replace function public.delete_training_with_plan(p_training_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_training public.trainings%rowtype;
  v_plan public.training_plans%rowtype;
begin
  select * into v_training
  from public.trainings
  where id = p_training_id
  for update;

  if not found then
    raise exception 'Training % was not found.', p_training_id using errcode = 'P0002';
  end if;

  select * into v_plan
  from public.training_plans
  where training_id = p_training_id
  for update;

  if found then
    insert into public.training_plan_events (
      training_plan_id, training_id, event_type, payload, created_by, processed_at
    ) values (
      v_plan.id,
      p_training_id,
      'unpublished',
      jsonb_build_object(
        'source', 'training_admin',
        'title', v_training.title,
        'reason', 'linked_training_deleted'
      ),
      auth.uid(),
      now()
    );

    update public.training_plans
    set
      training_id = null,
      status = case when status = 'completed' then 'completed' else 'planned' end,
      unpublished_at = case when status = 'completed' then unpublished_at else now() end,
      status_before_cancel = null,
      updated_at = now()
    where id = v_plan.id;
  end if;

  delete from public.trainings where id = p_training_id;

  return jsonb_build_object(
    'training_id', p_training_id,
    'plan_id', v_plan.id,
    'deleted', true
  );
end;
$$;

create or replace function public.unpublish_training_plan(p_plan_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan public.training_plans%rowtype;
begin
  select * into v_plan
  from public.training_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Training plan % was not found.', p_plan_id using errcode = 'P0002';
  end if;

  if v_plan.status not in ('published', 'in_progress') then
    raise exception 'Only a published plan can be unpublished.' using errcode = '22023';
  end if;

  if v_plan.training_id is not null then
    update public.trainings
    set is_active = false, was_active_before_cancel = false, updated_at = now()
    where id = v_plan.training_id;
  end if;

  update public.training_plans
  set
    status = 'planned',
    unpublished_at = now(),
    status_before_cancel = null,
    updated_at = now()
  where id = p_plan_id;

  insert into public.training_plan_events (
    training_plan_id, training_id, event_type, payload, created_by, processed_at
  ) values (
    p_plan_id,
    v_plan.training_id,
    'unpublished',
    jsonb_build_object('title', v_plan.title),
    auth.uid(),
    now()
  );

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'training_id', v_plan.training_id,
    'status', 'planned',
    'unpublished_at', now()
  );
end;
$$;

create or replace function public.cancel_training_plan(
  p_plan_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan public.training_plans%rowtype;
  v_training public.trainings%rowtype;
  v_reason text;
  v_notify boolean := false;
begin
  v_reason := nullif(btrim(p_reason), '');
  if v_reason is null then
    raise exception 'Cancellation reason is required.' using errcode = '22023';
  end if;

  select * into v_plan
  from public.training_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Training plan % was not found.', p_plan_id using errcode = 'P0002';
  end if;

  if v_plan.status = 'completed' then
    raise exception 'Completed plan cannot be cancelled.' using errcode = '22023';
  end if;

  if v_plan.training_id is not null then
    select * into v_training
    from public.trainings
    where id = v_plan.training_id
    for update;

    if found then
      v_notify := v_training.is_active;
      update public.trainings
      set
        status = 'cancelled',
        was_active_before_cancel = v_training.is_active,
        is_active = false,
        cancellation_reason = v_reason,
        updated_at = now()
      where id = v_plan.training_id;
    end if;
  end if;

  update public.training_plans
  set
    status_before_cancel = v_plan.status,
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = v_reason,
    updated_at = now()
  where id = p_plan_id;

  insert into public.training_plan_events (
    training_plan_id, training_id, event_type, payload, created_by, processed_at
  ) values (
    p_plan_id,
    v_plan.training_id,
    'cancelled',
    jsonb_build_object(
      'title', v_plan.title,
      'reason', v_reason,
      'was_active', v_notify
    ),
    auth.uid(),
    case when v_notify then null else now() end
  );

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'training_id', v_plan.training_id,
    'status', 'cancelled',
    'cancelled_at', now(),
    'cancellation_reason', v_reason,
    'notify', v_notify
  );
end;
$$;

create or replace function public.restore_cancelled_training_plan(p_plan_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan public.training_plans%rowtype;
  v_result jsonb;
begin
  select * into v_plan
  from public.training_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Training plan % was not found.', p_plan_id using errcode = 'P0002';
  end if;

  if v_plan.status <> 'cancelled' then
    raise exception 'Only a cancelled plan can be restored.' using errcode = '22023';
  end if;

  if v_plan.training_id is not null then
    select public.restore_training_with_plan(v_plan.training_id) into v_result;
    return v_result || jsonb_build_object('plan_id', p_plan_id);
  end if;

  update public.training_plans
  set
    status = 'planned',
    cancelled_at = null,
    cancellation_reason = null,
    status_before_cancel = null,
    updated_at = now()
  where id = p_plan_id;

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'training_id', null,
    'status', 'planned',
    'notify', false
  );
end;
$$;

create or replace function public.complete_training_plan(p_plan_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan public.training_plans%rowtype;
  v_result jsonb;
begin
  select * into v_plan
  from public.training_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Training plan % was not found.', p_plan_id using errcode = 'P0002';
  end if;

  if v_plan.status = 'cancelled' then
    raise exception 'Cancelled plan cannot be completed.' using errcode = '22023';
  end if;

  if v_plan.training_id is not null then
    select public.complete_training_with_plan(v_plan.training_id) into v_result;
    return v_result || jsonb_build_object('plan_id', p_plan_id);
  end if;

  update public.training_plans
  set status = 'completed', status_before_cancel = null, updated_at = now()
  where id = p_plan_id;

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'training_id', null,
    'status', 'completed'
  );
end;
$$;

create or replace function public.delete_training_plan_with_training(
  p_plan_id uuid,
  p_confirmation_title text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  return public.delete_training_plan_with_calendar(
    p_plan_id,
    p_confirmation_title
  );
end;
$$;

revoke all on function public.sync_training_event_from_plan(uuid) from public;
revoke all on function public.schedule_training_plan(uuid) from public;
revoke all on function public.publish_training_plan(uuid) from public;
revoke all on function public.update_training_event_with_plan(uuid, text, timestamptz, text, text) from public;
revoke all on function public.activate_training_with_plan(uuid) from public;
revoke all on function public.deactivate_training_with_plan(uuid) from public;
revoke all on function public.cancel_training_with_plan(uuid, text) from public;
revoke all on function public.restore_training_with_plan(uuid) from public;
revoke all on function public.complete_training_with_plan(uuid) from public;
revoke all on function public.delete_training_with_plan(uuid) from public;
revoke all on function public.unpublish_training_plan(uuid) from public;
revoke all on function public.cancel_training_plan(uuid, text) from public;
revoke all on function public.restore_cancelled_training_plan(uuid) from public;
revoke all on function public.complete_training_plan(uuid) from public;
revoke all on function public.delete_training_plan_with_training(uuid, text) from public;

grant execute on function public.sync_training_event_from_plan(uuid)
  to authenticated, service_role;
grant execute on function public.schedule_training_plan(uuid)
  to authenticated, service_role;
grant execute on function public.publish_training_plan(uuid)
  to authenticated, service_role;
grant execute on function public.update_training_event_with_plan(uuid, text, timestamptz, text, text)
  to authenticated, service_role;
grant execute on function public.activate_training_with_plan(uuid)
  to authenticated, service_role;
grant execute on function public.deactivate_training_with_plan(uuid)
  to authenticated, service_role;
grant execute on function public.cancel_training_with_plan(uuid, text)
  to authenticated, service_role;
grant execute on function public.restore_training_with_plan(uuid)
  to authenticated, service_role;
grant execute on function public.complete_training_with_plan(uuid)
  to authenticated, service_role;
grant execute on function public.delete_training_with_plan(uuid)
  to authenticated, service_role;
grant execute on function public.unpublish_training_plan(uuid)
  to authenticated, service_role;
grant execute on function public.cancel_training_plan(uuid, text)
  to authenticated, service_role;
grant execute on function public.restore_cancelled_training_plan(uuid)
  to authenticated, service_role;
grant execute on function public.complete_training_plan(uuid)
  to authenticated, service_role;
grant execute on function public.delete_training_plan_with_training(uuid, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
