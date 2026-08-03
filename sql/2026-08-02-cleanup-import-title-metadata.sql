-- Sprint 04.0.3 — one-time cleanup for QA import titles.
-- Removes only the service suffix "— ОНОВЛЕНО" (or its dash variants)
-- when it appears at the very end of an exercise title.

begin;

update public.exercises
set title = regexp_replace(
  title,
  '[[:space:]]+[—–-][[:space:]]+ОНОВЛЕНО[[:space:]]*$',
  '',
  'i'
)
where title ~* '[[:space:]]+[—–-][[:space:]]+ОНОВЛЕНО[[:space:]]*$';

commit;
