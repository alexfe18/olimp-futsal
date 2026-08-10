-- Sprint 05.3.6 — rollback
-- Restores the legacy direct browser attendance-write policies.

begin;

drop policy if exists "05.3.6 staff attendance insert"
  on public.training_attendance;
drop policy if exists "05.3.6 staff attendance update"
  on public.training_attendance;

drop function if exists public.get_my_training_attendance(uuid);
drop function if exists public.respond_to_player_training(uuid, uuid, text);
drop function if exists public.respond_to_training_public(uuid, uuid, text);

drop policy if exists "Public can add attendance"
  on public.training_attendance;
create policy "Public can add attendance"
on public.training_attendance
for insert
to anon, authenticated
with check (
  char_length(btrim(player_name)) >= 2
  and char_length(btrim(player_name)) <= 60
  and status in ('yes', 'maybe', 'no', 'no_response')
);

drop policy if exists "Public can update attendance"
  on public.training_attendance;
create policy "Public can update attendance"
on public.training_attendance
for update
to anon, authenticated
using (true)
with check (
  char_length(btrim(player_name)) >= 2
  and char_length(btrim(player_name)) <= 60
  and status in ('yes', 'maybe', 'no', 'no_response')
);

commit;
