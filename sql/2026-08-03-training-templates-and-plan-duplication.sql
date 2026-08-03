-- Sprint 05.1 — Training Templates & Plan Duplication
-- Run after all Sprint 05.0 Training Builder migrations.
-- Adds reusable training templates, template blocks, RLS policies and
-- an atomic save_training_template_draft RPC.

begin;

create table if not exists public.training_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  team_name text,
  age_group text,
  objective text,
  planned_duration integer not null default 1,
  intensity text not null default 'medium',
  status text not null default 'active',
  notes text,
  source_plan_id uuid references public.training_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_templates_title_check
    check (nullif(btrim(title), '') is not null),
  constraint training_templates_planned_duration_check
    check (planned_duration between 1 and 3000),
  constraint training_templates_intensity_check
    check (intensity in ('low', 'medium', 'high', 'recovery')),
  constraint training_templates_status_check
    check (status in ('active', 'archived'))
);

create table if not exists public.training_template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.training_templates(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on update cascade on delete set null,
  title text not null,
  description text,
  duration_minutes integer not null default 10,
  block_type text not null default 'custom',
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_template_blocks_title_check
    check (nullif(btrim(title), '') is not null),
  constraint training_template_blocks_duration_check
    check (duration_minutes between 1 and 300),
  constraint training_template_blocks_sort_order_check
    check (sort_order >= 0)
);

create index if not exists training_templates_status_updated_idx
  on public.training_templates (status, updated_at desc);

create index if not exists training_templates_age_intensity_idx
  on public.training_templates (age_group, intensity);

create index if not exists training_template_blocks_template_sort_idx
  on public.training_template_blocks (template_id, sort_order);

create index if not exists training_template_blocks_exercise_idx
  on public.training_template_blocks (exercise_id)
  where exercise_id is not null;

comment on table public.training_templates is
  'Reusable Training Builder templates. Templates are copied into plans and remain independent afterwards.';
comment on table public.training_template_blocks is
  'Ordered snapshot blocks that belong to a reusable training template.';
comment on column public.training_templates.source_plan_id is
  'Optional plan that was used to create this template.';

alter table public.training_templates enable row level security;
alter table public.training_template_blocks enable row level security;

drop policy if exists "Authenticated users manage training templates"
  on public.training_templates;
create policy "Authenticated users manage training templates"
  on public.training_templates
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users manage training template blocks"
  on public.training_template_blocks;
create policy "Authenticated users manage training template blocks"
  on public.training_template_blocks
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.training_templates
  to authenticated, service_role;
grant select, insert, update, delete on public.training_template_blocks
  to authenticated, service_role;

create or replace function public.save_training_template_draft(
  p_template_id uuid,
  p_title text,
  p_team_name text,
  p_age_group text,
  p_objective text,
  p_notes text,
  p_intensity text,
  p_status text,
  p_source_plan_id uuid,
  p_blocks jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_template_id uuid;
  v_total_duration integer;
begin
  if nullif(btrim(p_title), '') is null then
    raise exception 'Training template title is required.' using errcode = '22023';
  end if;

  if p_intensity not in ('low', 'medium', 'high', 'recovery') then
    raise exception 'Unsupported training-template intensity: %', p_intensity
      using errcode = '22023';
  end if;

  if p_status not in ('active', 'archived') then
    raise exception 'Unsupported training-template status: %', p_status
      using errcode = '22023';
  end if;

  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'Training template blocks must be a JSON array.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_blocks) < 1 then
    raise exception 'At least one training-template block is required.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_blocks) as block(value)
    where jsonb_typeof(block.value) <> 'object'
  ) then
    raise exception 'Every training-template block must be a JSON object.'
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
    raise exception 'Training template duration must be greater than zero.'
      using errcode = '22023';
  end if;

  if p_template_id is null then
    insert into public.training_templates (
      title,
      team_name,
      age_group,
      objective,
      planned_duration,
      intensity,
      status,
      notes,
      source_plan_id
    )
    values (
      btrim(p_title),
      nullif(btrim(p_team_name), ''),
      nullif(btrim(p_age_group), ''),
      nullif(btrim(p_objective), ''),
      v_total_duration,
      p_intensity,
      p_status,
      nullif(btrim(p_notes), ''),
      p_source_plan_id
    )
    returning id into v_template_id;
  else
    update public.training_templates
    set
      title = btrim(p_title),
      team_name = nullif(btrim(p_team_name), ''),
      age_group = nullif(btrim(p_age_group), ''),
      objective = nullif(btrim(p_objective), ''),
      planned_duration = v_total_duration,
      intensity = p_intensity,
      status = p_status,
      notes = nullif(btrim(p_notes), ''),
      source_plan_id = coalesce(p_source_plan_id, source_plan_id),
      updated_at = now()
    where id = p_template_id
    returning id into v_template_id;

    if v_template_id is null then
      raise exception 'Training template % was not found.', p_template_id
        using errcode = 'P0002';
    end if;

    delete from public.training_template_blocks
    where template_id = v_template_id;
  end if;

  insert into public.training_template_blocks (
    template_id,
    exercise_id,
    title,
    description,
    duration_minutes,
    block_type,
    sort_order,
    notes
  )
  select
    v_template_id,
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
  from public.training_template_blocks
  where template_id = v_template_id;

  update public.training_templates
  set
    planned_duration = v_total_duration,
    updated_at = now()
  where id = v_template_id;

  return v_template_id;
end;
$$;

revoke all on function public.save_training_template_draft(
  uuid, text, text, text, text, text, text, text, uuid, jsonb
) from public;

grant execute on function public.save_training_template_draft(
  uuid, text, text, text, text, text, text, text, uuid, jsonb
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
