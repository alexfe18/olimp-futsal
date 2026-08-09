-- Sprint 05.3.5 — EMERGENCY RLS rollback
-- Restores the exact legacy training policies observed during the 2026-08-09 preflight.
-- This re-opens broad public access and should only be used if the application cannot operate after migration.

begin;

-- Remove 05.3.5 policies.
drop policy if exists "05.3.5 public active training read" on public.trainings;
drop policy if exists "05.3.5 authenticated training read" on public.trainings;
drop policy if exists "05.3.5 authenticated training insert" on public.trainings;
drop policy if exists "05.3.5 authenticated training update" on public.trainings;
drop policy if exists "05.3.5 authenticated training delete" on public.trainings;

drop policy if exists "05.3.5 training plans read" on public.training_plans;
drop policy if exists "05.3.5 training plans insert" on public.training_plans;
drop policy if exists "05.3.5 training plans update" on public.training_plans;
drop policy if exists "05.3.5 training plans delete" on public.training_plans;

drop policy if exists "05.3.5 training plan blocks read" on public.training_plan_blocks;
drop policy if exists "05.3.5 training plan blocks insert" on public.training_plan_blocks;
drop policy if exists "05.3.5 training plan blocks update" on public.training_plan_blocks;
drop policy if exists "05.3.5 training plan blocks delete" on public.training_plan_blocks;

-- Legacy training plan policies.
create policy "Allow public read training plans"
on public.training_plans for select to public using (true);
create policy "Allow public insert training plans"
on public.training_plans for insert to public with check (true);
create policy "Allow public update training plans"
on public.training_plans for update to public using (true) with check (true);
create policy "Allow public delete training plans"
on public.training_plans for delete to public using (true);

-- Legacy training plan block policies.
create policy "Allow public read training plan blocks"
on public.training_plan_blocks for select to public using (true);
create policy "Allow public insert training plan blocks"
on public.training_plan_blocks for insert to public with check (true);
create policy "Allow public update training plan blocks"
on public.training_plan_blocks for update to public using (true) with check (true);
create policy "Allow public delete training plan blocks"
on public.training_plan_blocks for delete to public using (true);

-- Legacy training policies.
create policy "Public can read trainings"
on public.trainings for select to anon, authenticated using (true);

create policy "Admin can insert trainings"
on public.trainings for insert to authenticated
with check (auth.uid() = '129a0d26-b747-4027-8314-6c8154f31888'::uuid);

create policy "Admin can update trainings"
on public.trainings for update to authenticated
using (auth.uid() = '129a0d26-b747-4027-8314-6c8154f31888'::uuid)
with check (auth.uid() = '129a0d26-b747-4027-8314-6c8154f31888'::uuid);

create policy "Admin can delete trainings"
on public.trainings for delete to authenticated
using (auth.uid() = '129a0d26-b747-4027-8314-6c8154f31888'::uuid);

commit;
