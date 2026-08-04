# Sprint 05.2 — Training Publish Flow

## Release scope

- Draft → Planned → Published → Completed/Cancelled lifecycle.
- Date, time, location and team validation before publication.
- Atomic linked training creation/update through Supabase RPC.
- Link from `training_plans` to `trainings` and Attendance.
- Publish, unpublish, cancel, restore and complete actions.
- Automatic deactivation/unpublishing of the previous active RSVP session.
- `training_plan_events` outbox for future push integrations.
- Plan-list status/date filters and linked training/Attendance shortcuts.
- Safe deletion rules for published and completed plans.

## Required SQL

Run:

```text
sql/2026-08-03-training-publish-flow.sql
```

after all Sprint 05.0 and Sprint 05.1 migrations.

## Not included

- Automatic push delivery.
- Multiple simultaneous active RSVP sessions.
- Player-facing display of the full exercise plan.
- Recurring training sessions and the future general club calendar.
