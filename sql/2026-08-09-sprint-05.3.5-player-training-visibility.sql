-- Sprint 05.3.5 — Player Training Visibility
-- Project: «Олімп Футзал»
-- Release: 0.6.0-alpha.6
--
-- Scope:
--   * replace broad legacy RLS on trainings/training_plans/training_plan_blocks;
--   * preserve public access to the ONE currently active scheduled training used by /training;
--   * let authenticated players read only active scheduled trainings in their own team;
--   * keep full training / training-plan access for Owner and authorized staff;
--   * keep player-facing UI away from training_plans / methodology data;
--   * no data rows are changed by this migration.

begin;

DO $preflight$
begin
  if not exists (
    select 1 from public.teams where code = 'adult' and status = 'active'
  ) then
    raise exception 'Sprint 05.3.5 requires the active adult team foundation.';
  end if;

  if to_regclass('public.trainings') is null
     or to_regclass('public.training_plans') is null
     or to_regclass('public.training_plan_blocks') is null then
    raise exception 'Sprint 05.3.5 training tables are missing.';
  end if;
end;
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Concrete training events
-- ---------------------------------------------------------------------------

alter table public.trainings enable row level security;

drop policy if exists "Public can read trainings" on public.trainings;
drop policy if exists "Admin can insert trainings" on public.trainings;
drop policy if exists "Admin can update trainings" on public.trainings;
drop policy if exists "Admin can delete trainings" on public.trainings;

drop policy if exists "05.3.5 public active training read" on public.trainings;
drop policy if exists "05.3.5 authenticated training read" on public.trainings;
drop policy if exists "05.3.5 authenticated training insert" on public.trainings;
drop policy if exists "05.3.5 authenticated training update" on public.trainings;
drop policy if exists "05.3.5 authenticated training delete" on public.trainings;

-- Public /training attendance page still needs the currently published event.
-- It must not expose completed, cancelled or unpublished rows.
create policy "05.3.5 public active training read"
on public.trainings
for select
to anon
using (
  is_active = true
  and status = 'scheduled'
);

-- Staff with full plan access can read operational/history rows in their scope.
-- Players/guardians receive only the active scheduled event in their own team.
create policy "05.3.5 authenticated training read"
on public.trainings
for select
to authenticated
using (
  app_private.is_active_profile()
  and (
    app_private.has_global_permission('trainings.read')
    or (
      team_id is not null
      and app_private.has_team_permission('training_plans.read', team_id)
    )
    or (
      team_id is not null
      and is_active = true
      and status = 'scheduled'
      and app_private.has_team_permission('trainings.read', team_id)
    )
  )
);

create policy "05.3.5 authenticated training insert"
on public.trainings
for insert
to authenticated
with check (
  app_private.has_global_permission('trainings.create')
  or (
    team_id is not null
    and app_private.has_team_permission('trainings.create', team_id)
  )
);

create policy "05.3.5 authenticated training update"
on public.trainings
for update
to authenticated
using (
  app_private.has_global_permission('trainings.update')
  or (
    team_id is not null
    and app_private.has_team_permission('trainings.update', team_id)
  )
)
with check (
  app_private.has_global_permission('trainings.update')
  or (
    team_id is not null
    and app_private.has_team_permission('trainings.update', team_id)
  )
);

create policy "05.3.5 authenticated training delete"
on public.trainings
for delete
to authenticated
using (
  app_private.has_global_permission('trainings.delete')
  or (
    team_id is not null
    and app_private.has_team_permission('trainings.delete', team_id)
  )
);

-- ---------------------------------------------------------------------------
-- 2. Training plans — methodology is NOT directly player-readable
-- ---------------------------------------------------------------------------

alter table public.training_plans enable row level security;

drop policy if exists "Allow public read training plans" on public.training_plans;
drop policy if exists "Allow public insert training plans" on public.training_plans;
drop policy if exists "Allow public update training plans" on public.training_plans;
drop policy if exists "Allow public delete training plans" on public.training_plans;

drop policy if exists "05.3.5 training plans read" on public.training_plans;
drop policy if exists "05.3.5 training plans insert" on public.training_plans;
drop policy if exists "05.3.5 training plans update" on public.training_plans;
drop policy if exists "05.3.5 training plans delete" on public.training_plans;

create policy "05.3.5 training plans read"
on public.training_plans
for select
to authenticated
using (
  app_private.has_global_permission('training_plans.read')
  or (
    team_id is not null
    and app_private.has_team_permission('training_plans.read', team_id)
  )
);

create policy "05.3.5 training plans insert"
on public.training_plans
for insert
to authenticated
with check (
  app_private.has_global_permission('training_plans.create')
  or (
    team_id is not null
    and app_private.has_team_permission('training_plans.create', team_id)
  )
);

create policy "05.3.5 training plans update"
on public.training_plans
for update
to authenticated
using (
  app_private.has_global_permission('training_plans.update')
  or (
    team_id is not null
    and app_private.has_team_permission('training_plans.update', team_id)
  )
)
with check (
  app_private.has_global_permission('training_plans.update')
  or (
    team_id is not null
    and app_private.has_team_permission('training_plans.update', team_id)
  )
);

create policy "05.3.5 training plans delete"
on public.training_plans
for delete
to authenticated
using (
  app_private.has_global_permission('training_plans.archive')
  or (
    team_id is not null
    and app_private.has_team_permission('training_plans.archive', team_id)
  )
);

-- ---------------------------------------------------------------------------
-- 3. Training-plan blocks — inherit full-plan staff permissions only
-- ---------------------------------------------------------------------------

alter table public.training_plan_blocks enable row level security;

drop policy if exists "Allow public read training plan blocks" on public.training_plan_blocks;
drop policy if exists "Allow public insert training plan blocks" on public.training_plan_blocks;
drop policy if exists "Allow public update training plan blocks" on public.training_plan_blocks;
drop policy if exists "Allow public delete training plan blocks" on public.training_plan_blocks;

drop policy if exists "05.3.5 training plan blocks read" on public.training_plan_blocks;
drop policy if exists "05.3.5 training plan blocks insert" on public.training_plan_blocks;
drop policy if exists "05.3.5 training plan blocks update" on public.training_plan_blocks;
drop policy if exists "05.3.5 training plan blocks delete" on public.training_plan_blocks;

create policy "05.3.5 training plan blocks read"
on public.training_plan_blocks
for select
to authenticated
using (
  exists (
    select 1
    from public.training_plans plan
    where plan.id = training_plan_id
      and (
        app_private.has_global_permission('training_plans.read')
        or (
          plan.team_id is not null
          and app_private.has_team_permission('training_plans.read', plan.team_id)
        )
      )
  )
);

create policy "05.3.5 training plan blocks insert"
on public.training_plan_blocks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.training_plans plan
    where plan.id = training_plan_id
      and (
        app_private.has_global_permission('training_plans.update')
        or (
          plan.team_id is not null
          and app_private.has_team_permission('training_plans.update', plan.team_id)
        )
      )
  )
);

create policy "05.3.5 training plan blocks update"
on public.training_plan_blocks
for update
to authenticated
using (
  exists (
    select 1
    from public.training_plans plan
    where plan.id = training_plan_id
      and (
        app_private.has_global_permission('training_plans.update')
        or (
          plan.team_id is not null
          and app_private.has_team_permission('training_plans.update', plan.team_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.training_plans plan
    where plan.id = training_plan_id
      and (
        app_private.has_global_permission('training_plans.update')
        or (
          plan.team_id is not null
          and app_private.has_team_permission('training_plans.update', plan.team_id)
        )
      )
  )
);

create policy "05.3.5 training plan blocks delete"
on public.training_plan_blocks
for delete
to authenticated
using (
  exists (
    select 1
    from public.training_plans plan
    where plan.id = training_plan_id
      and (
        app_private.has_global_permission('training_plans.update')
        or (
          plan.team_id is not null
          and app_private.has_team_permission('training_plans.update', plan.team_id)
        )
      )
  )
);

commit;
