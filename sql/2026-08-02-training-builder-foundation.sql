-- Sprint 05.0 — Training Builder Foundation
-- Run in Supabase SQL Editor before opening the updated Training Builder.
-- The migration is idempotent and can be executed more than once.

begin;

alter table public.training_plans
  add column if not exists session_date date,
  add column if not exists team_name text,
  add column if not exists age_group text;

alter table public.training_plan_blocks
  add column if not exists exercise_id uuid;

alter table public.training_plan_blocks
  drop constraint if exists training_plan_blocks_exercise_id_fkey;

alter table public.training_plan_blocks
  add constraint training_plan_blocks_exercise_id_fkey
  foreign key (exercise_id)
  references public.exercises(id)
  on update cascade
  on delete set null;

create index if not exists training_plan_blocks_plan_sort_idx
  on public.training_plan_blocks (training_plan_id, sort_order);

create index if not exists training_plan_blocks_exercise_idx
  on public.training_plan_blocks (exercise_id)
  where exercise_id is not null;

update public.training_plans as plan
set session_date = training.starts_at::date
from public.trainings as training
where plan.training_id = training.id
  and plan.session_date is null;

comment on column public.training_plans.session_date is
  'Training-session date used by the Training Builder draft.';
comment on column public.training_plans.team_name is
  'Team or squad name for the training-session draft.';
comment on column public.training_plans.age_group is
  'Age group selected in the Training Builder.';
comment on column public.training_plan_blocks.exercise_id is
  'Optional link from a training-plan block to Exercise Library.';

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
  v_plan_id uuid;
  v_total_duration integer;
begin
  if nullif(btrim(p_title), '') is null then
    raise exception 'Training plan title is required.' using errcode = '22023';
  end if;

  if p_intensity not in ('low', 'medium', 'high', 'recovery') then
    raise exception 'Unsupported training-plan intensity: %', p_intensity
      using errcode = '22023';
  end if;

  if p_status not in ('draft', 'planned', 'in_progress', 'completed', 'cancelled') then
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


  if p_plan_id is null then
    insert into public.training_plans (
      title,
      session_date,
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
      nullif(btrim(p_team_name), ''),
      nullif(btrim(p_age_group), ''),
      nullif(btrim(p_objective), ''),
      0,
      p_intensity,
      p_status,
      nullif(btrim(p_notes), '')
    )
    returning id into v_plan_id;
  else
    update public.training_plans
    set
      title = btrim(p_title),
      session_date = p_session_date,
      team_name = nullif(btrim(p_team_name), ''),
      age_group = nullif(btrim(p_age_group), ''),
      objective = nullif(btrim(p_objective), ''),
      intensity = p_intensity,
      status = p_status,
      notes = nullif(btrim(p_notes), ''),
      updated_at = now()
    where id = p_plan_id
    returning id into v_plan_id;

    if v_plan_id is null then
      raise exception 'Training plan % was not found.', p_plan_id
        using errcode = 'P0002';
    end if;

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

  return v_plan_id;
end;
$$;

revoke all on function public.save_training_plan_draft(
  uuid,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public;

grant execute on function public.save_training_plan_draft(
  uuid,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
