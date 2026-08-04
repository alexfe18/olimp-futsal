# Sprint 05.2.1 — Plan ↔ Training Integration & UX Completion

## Delivered

- Planning creates one inactive linked training on the selected day.
- Publishing activates the same training UUID without duplication.
- Bidirectional Plan ↔ Training navigation.
- Read-only plan summary in training cards.
- Event date, time, location and team synchronization in both directions.
- Linked training title is read-only outside Training Builder.
- Existing Push integration for publish, update, cancel and restore.
- Correct reschedule/location/team notification copy with previous context.
- Attendance links reuse the linked `training_id`.
- Cancel/restore/complete/unpublish synchronization.
- Manual trainings without plans remain supported.
- Player-facing event shows the assigned team.

## Database

Required migration:

```text
sql/2026-08-04-plan-training-integration-ux-completion.sql
```

Run it after the Sprint 05.2 migration.

## Not included

- Team plan visibility modes — Sprint 05.3.
- General club calendar — Sprint 05.4.
- Team chat and sharing — future scope.
