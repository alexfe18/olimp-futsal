-- EMERGENCY rollback for Sprint 05.3.6.2 B.6.4.
-- This intentionally restores the legacy public attendance access and should only
-- be used if B.6.4 must be fully reverted in DEV.

begin;

drop function if exists public.get_training_attendance_board(uuid);

drop policy if exists "05.3.6.2 authenticated team attendance read" on public.training_attendance;

drop policy if exists "Public can read attendance" on public.training_attendance;
create policy "Public can read attendance"
on public.training_attendance
for select
to anon, authenticated
using (true);

grant select, insert, update, delete, truncate, references, trigger
on table public.training_attendance
to anon;

grant execute on function public.get_my_training_attendance(uuid) to public, anon, authenticated;
grant execute on function public.respond_to_player_training(uuid, uuid, text) to public, anon, authenticated;
grant execute on function public.respond_to_training_public(uuid, uuid, text) to public, anon, authenticated;

commit;
