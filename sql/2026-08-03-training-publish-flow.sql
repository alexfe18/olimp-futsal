-- Sprint 05.2 — Training Publish Flow
-- Run after Sprint 05.1 migrations.
-- Adds publish lifecycle metadata, calendar/attendance linkage and a future push event outbox.
-- The migration is idempotent and does not break the existing Sprint 05.1 RPC.

begin;

alter table public.training_plans
  add column if not exists training_id uuid,
  add column if not exists session_time time without time zone,
  add column if not exists location text,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid,
  add column if not exists unpublished_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

alter table public.training_plans
  drop constraint if exists training_plans_training_id_fkey;

alter table public.training_plans
  add constraint training_plans_training_id_fkey
  foreign key (training_id)
  references public.trainings(id)
  on update cascade
  on delete set null;

alter table public.training_plans
  drop constraint if exists training_plans_published_by_fkey;

alter table public.training_plans
  add constraint training_plans_published_by_fkey
  foreign key (published_by)
  references auth.users(id)
  on delete set null;

alter table public.training_plans
  drop constraint if exists training_plans_status_check;

alter table public.training_plans
  add constraint training_plans_status_check
  check (
    status in (
      'draft',
      'planned',
      'published',
      'in_progress',
      'completed',
      'cancelled'
    )
  );

create unique index if not exists training_plans_training_id_unique_idx
  on public.training_plans (training_id)
  where training_id is not null;

create index if not exists training_plans_status_session_idx
  on public.training_plans (status, session_date desc, session_time desc);

create index if not exists training_plans_published_at_idx
  on public.training_plans (published_at desc)
  where published_at is not null;

update public.training_plans as plan
set
  session_time = coalesce(plan.session_time, (training.starts_at at time zone 'Europe/Kyiv')::time),
  location = coalesce(nullif(btrim(plan.location), ''), training.location)
from public.trainings as training
where plan.training_id = training.id
  and (plan.session_time is null or nullif(btrim(plan.location), '') is null);

comment on column public.training_plans.session_time is
  'Local Europe/Kyiv start time used by Training Publish Flow.';
comment on column public.training_plans.location is
  'Published training location copied to the calendar training record.';
comment on column public.training_plans.training_id is
  'Calendar/attendance training created or updated when the plan is published.';
comment on column public.training_plans.published_at is
  'Latest publication timestamp.';
comment on column public.training_plans.published_by is
  'Authenticated user who last published the plan.';
comment on column public.training_plans.unpublished_at is
  'Timestamp when the plan was last removed from player publication.';
comment on column public.training_plans.cancelled_at is
  'Timestamp when the planned/published session was cancelled.';
comment on column public.training_plans.cancellation_reason is
  'Coach-facing cancellation reason synchronized with trainings.';

create table if not exists public.training_plan_events (
  id uuid primary key default gen_random_uuid(),
  training_plan_id uuid not null references public.training_plans(id) on delete cascade,
  training_id uuid references public.trainings(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint training_plan_events_type_check
    check (event_type in ('published', 'updated', 'unpublished', 'cancelled', 'restored', 'completed'))
);

create index if not exists training_plan_events_plan_created_idx
  on public.training_plan_events (training_plan_id, created_at desc);

create index if not exists training_plan_events_unprocessed_idx
  on public.training_plan_events (created_at)
  where processed_at is null;

comment on table public.training_plan_events is
  'Outbox for future push notifications and integrations. Sprint 05.2 records events but does not send notifications.';

alter table public.training_plan_events enable row level security;

drop policy if exists "Authenticated users read training plan events"
  on public.training_plan_events;
create policy "Authenticated users read training plan events"
  on public.training_plan_events
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users create training plan events"
  on public.training_plan_events;
create policy "Authenticated users create training plan events"
  on public.training_plan_events
  for insert
  to authenticated
  with check (true);

grant select, insert, update on public.training_plan_events
  to authenticated, service_role;

-- New versioned save RPC. The Sprint 05.1 RPC stays available until Production is upgraded.
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
  v_previous_status text;
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

  if p_status in ('published', 'in_progress', 'completed') then
    if p_session_date is null or p_session_time is null then
      raise exception 'Published training requires date and time.'
        using errcode = '22023';
    end if;

    if nullif(btrim(p_location), '') is null then
      raise exception 'Published training requires location.'
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
    )
    values (
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
    select training_id, status
    into v_training_id, v_previous_status
    from public.training_plans
    where id = p_plan_id
    for update;

    if not found then
      raise exception 'Training plan % was not found.', p_plan_id
        using errcode = 'P0002';
    end if;

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
  set
    planned_duration = v_total_duration,
    updated_at = now()
  where id = v_plan_id;

  -- Editing a published plan updates its linked calendar/attendance event immediately.
  if v_training_id is not null and p_status in ('published', 'in_progress') then
    v_starts_at := (p_session_date::timestamp + p_session_time) at time zone 'Europe/Kyiv';

    update public.trainings
    set
      title = btrim(p_title),
      starts_at = v_starts_at,
      location = btrim(p_location),
      status = 'scheduled',
      cancellation_reason = null,
      updated_at = now()
    where id = v_training_id;

    insert into public.training_plan_events (
      training_plan_id,
      training_id,
      event_type,
      payload,
      created_by
    )
    values (
      v_plan_id,
      v_training_id,
      'updated',
      jsonb_build_object(
        'title', btrim(p_title),
        'starts_at', v_starts_at,
        'location', btrim(p_location),
        'previous_status', v_previous_status
      ),
      auth.uid()
    );
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

-- Backward-compatible wrapper for Release 0.5.1 during shared-database Preview QA.
create or replace function public.save_training_plan_draft(
  p_plan_id uuid,
  p_title text,
  p_session_date date,
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
  v_session_time time without time zone;
  v_location text;
begin
  if p_plan_id is not null then
    select session_time, location
    into v_session_time, v_location
    from public.training_plans
    where id = p_plan_id;
  end if;

  return public.save_training_plan_draft_v2(
    p_plan_id,
    p_title,
    p_session_date,
    v_session_time,
    v_location,
    p_team_name,
    p_age_group,
    p_objective,
    p_notes,
    p_intensity,
    p_status,
    p_blocks
  );
end;
$$;

revoke all on function public.save_training_plan_draft(
  uuid, text, date, text, text, text, text, text, text, jsonb
) from public;

grant execute on function public.save_training_plan_draft(
  uuid, text, date, text, text, text, text, text, text, jsonb
) to authenticated, service_role;

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

  v_starts_at := (v_plan.session_date::timestamp + v_plan.session_time) at time zone 'Europe/Kyiv';
  v_training_id := v_plan.training_id;

  -- The current player RSVP UI supports one active training at a time.
  -- Publishing a new session automatically removes the previous active plan
  -- from player publication while preserving its calendar and attendance data.
  insert into public.training_plan_events (
    training_plan_id, training_id, event_type, payload, created_by
  )
  select
    previous_plan.id,
    previous_plan.training_id,
    'unpublished',
    jsonb_build_object(
      'title', previous_plan.title,
      'reason', 'another_training_published'
    ),
    auth.uid()
  from public.training_plans as previous_plan
  where previous_plan.status = 'published'
    and previous_plan.id <> p_plan_id
    and previous_plan.training_id in (
      select id
      from public.trainings
      where is_active = true
        and (v_training_id is null or id <> v_training_id)
    );

  update public.training_plans
  set
    status = 'planned',
    unpublished_at = now(),
    updated_at = now()
  where status = 'published'
    and id <> p_plan_id
    and training_id in (
      select id
      from public.trainings
      where is_active = true
        and (v_training_id is null or id <> v_training_id)
    );

  update public.trainings
  set is_active = false, updated_at = now()
  where is_active = true
    and (v_training_id is null or id <> v_training_id);

  if v_training_id is null then
    insert into public.trainings (
      title,
      starts_at,
      location,
      is_active,
      status,
      cancellation_reason
    )
    values (
      v_plan.title,
      v_starts_at,
      v_plan.location,
      true,
      'scheduled',
      null
    )
    returning id into v_training_id;
  else
    update public.trainings
    set
      title = v_plan.title,
      starts_at = v_starts_at,
      location = v_plan.location,
      is_active = true,
      status = 'scheduled',
      cancellation_reason = null,
      updated_at = now()
    where id = v_training_id;
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
    updated_at = now()
  where id = p_plan_id;

  insert into public.training_plan_events (
    training_plan_id,
    training_id,
    event_type,
    payload,
    created_by
  )
  values (
    p_plan_id,
    v_training_id,
    'published',
    jsonb_build_object(
      'title', v_plan.title,
      'starts_at', v_starts_at,
      'location', v_plan.location,
      'team_name', v_plan.team_name,
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

  if v_plan.status <> 'published' then
    raise exception 'Only a published plan can be unpublished.' using errcode = '22023';
  end if;

  if v_plan.training_id is not null then
    update public.trainings
    set is_active = false, updated_at = now()
    where id = v_plan.training_id;
  end if;

  update public.training_plans
  set
    status = 'planned',
    unpublished_at = now(),
    updated_at = now()
  where id = p_plan_id;

  insert into public.training_plan_events (
    training_plan_id, training_id, event_type, payload, created_by
  ) values (
    p_plan_id,
    v_plan.training_id,
    'unpublished',
    jsonb_build_object('title', v_plan.title),
    auth.uid()
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
  v_reason text;
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
    update public.trainings
    set
      status = 'cancelled',
      is_active = false,
      cancellation_reason = v_reason,
      updated_at = now()
    where id = v_plan.training_id;
  end if;

  update public.training_plans
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = v_reason,
    updated_at = now()
  where id = p_plan_id;

  insert into public.training_plan_events (
    training_plan_id, training_id, event_type, payload, created_by
  ) values (
    p_plan_id,
    v_plan.training_id,
    'cancelled',
    jsonb_build_object('title', v_plan.title, 'reason', v_reason),
    auth.uid()
  );

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'training_id', v_plan.training_id,
    'status', 'cancelled',
    'cancelled_at', now(),
    'cancellation_reason', v_reason
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
    update public.trainings
    set
      status = 'scheduled',
      is_active = false,
      cancellation_reason = null,
      updated_at = now()
    where id = v_plan.training_id;
  end if;

  update public.training_plans
  set
    status = 'planned',
    cancelled_at = null,
    cancellation_reason = null,
    updated_at = now()
  where id = p_plan_id;

  insert into public.training_plan_events (
    training_plan_id, training_id, event_type, payload, created_by
  ) values (
    p_plan_id,
    v_plan.training_id,
    'restored',
    jsonb_build_object('title', v_plan.title),
    auth.uid()
  );

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'training_id', v_plan.training_id,
    'status', 'planned'
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
    update public.trainings
    set
      status = 'completed',
      is_active = false,
      cancellation_reason = null,
      updated_at = now()
    where id = v_plan.training_id;
  end if;

  update public.training_plans
  set
    status = 'completed',
    updated_at = now()
  where id = p_plan_id;

  insert into public.training_plan_events (
    training_plan_id, training_id, event_type, payload, created_by
  ) values (
    p_plan_id,
    v_plan.training_id,
    'completed',
    jsonb_build_object('title', v_plan.title),
    auth.uid()
  );

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'training_id', v_plan.training_id,
    'status', 'completed'
  );
end;
$$;

create or replace function public.delete_training_plan_with_calendar(
  p_plan_id uuid,
  p_confirmation_title text default null
)
returns boolean
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

  if v_plan.status in ('published', 'in_progress') then
    raise exception 'Published or active plan must be unpublished or cancelled before deletion.' using errcode = '22023';
  end if;

  if v_plan.status = 'completed' and btrim(coalesce(p_confirmation_title, '')) <> v_plan.title then
    raise exception 'Exact plan title is required to delete a completed plan.' using errcode = '22023';
  end if;

  delete from public.training_plans where id = p_plan_id;

  if v_plan.training_id is not null then
    delete from public.trainings where id = v_plan.training_id;
  end if;

  return true;
end;
$$;

revoke all on function public.publish_training_plan(uuid) from public;
revoke all on function public.unpublish_training_plan(uuid) from public;
revoke all on function public.cancel_training_plan(uuid, text) from public;
revoke all on function public.restore_cancelled_training_plan(uuid) from public;
revoke all on function public.complete_training_plan(uuid) from public;
revoke all on function public.delete_training_plan_with_calendar(uuid, text) from public;

grant execute on function public.publish_training_plan(uuid)
  to authenticated, service_role;
grant execute on function public.unpublish_training_plan(uuid)
  to authenticated, service_role;
grant execute on function public.cancel_training_plan(uuid, text)
  to authenticated, service_role;
grant execute on function public.restore_cancelled_training_plan(uuid)
  to authenticated, service_role;
grant execute on function public.complete_training_plan(uuid)
  to authenticated, service_role;
grant execute on function public.delete_training_plan_with_calendar(uuid, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
