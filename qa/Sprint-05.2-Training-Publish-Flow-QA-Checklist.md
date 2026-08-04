# Sprint 05.2 — Training Publish Flow QA Checklist

## Migration

- [ ] SQL completes without errors after Sprint 05.1.
- [ ] Existing draft/template data remains available.
- [ ] `training_plan_events` exists with RLS enabled.
- [ ] Existing Production 0.5.1 can still save through the old RPC before deployment.

## Draft and planned

- [ ] Draft saves without date/time/location.
- [ ] Plan cannot be marked planned without date, time, location and team.
- [ ] `Запланувати без публікації` saves status `planned`.
- [ ] Planned plan does not create a `trainings` record.
- [ ] Date/time/location survive reload.

## Publish

- [ ] Draft/planned plan can be published.
- [ ] Publish creates exactly one linked `trainings` record.
- [ ] `training_plans.training_id` is populated.
- [ ] Plan status becomes `published`.
- [ ] `published_at` is populated.
- [ ] Calendar title/date/time/location match the plan.
- [ ] Published session becomes active on `/training`.
- [ ] Attendance page opens from the Builder.
- [ ] A `published` event is created.

## Published edit

- [ ] Save shows a warning before updating a published plan.
- [ ] Date/time/location/title changes update the linked training record.
- [ ] Blocks and notes save normally.
- [ ] An `updated` event is created.
- [ ] No duplicate `trainings` record is created.

## One active RSVP session

- [ ] Publishing a second plan deactivates the previous active training.
- [ ] Previous plan changes from `published` to `planned`.
- [ ] Previous linked training and Attendance data remain available.

## Unpublish

- [ ] `Зняти з публікації` changes status to `planned`.
- [ ] Linked training becomes inactive but is not deleted.
- [ ] Existing attendance responses remain.
- [ ] An `unpublished` event is created.

## Cancel and restore

- [ ] Empty cancellation reason is rejected.
- [ ] Cancellation updates plan and linked training.
- [ ] Cancelled training is not active for players.
- [ ] Reason is shown in Builder and plan list.
- [ ] Restore returns the plan to `planned`.
- [ ] Restored plan requires explicit republish.

## Complete

- [ ] Published training can be completed.
- [ ] Plan and linked training become completed.
- [ ] Player RSVP is closed.
- [ ] Attendance data remains available.

## Delete safety

- [ ] Published plan cannot be deleted.
- [ ] Planned/draft plan deletion removes linked training record if one exists.
- [ ] Completed plan requires its exact title.
- [ ] Cancelled plan deletion requires confirmation.

## List and responsive UI

- [ ] Published statistic is correct.
- [ ] Status filter includes Published.
- [ ] Date filters work: upcoming, past, without date.
- [ ] Cards display time, location and cancellation reason.
- [ ] Calendar and Attendance shortcuts appear only for linked plans.
- [ ] Desktop layout works at 1280/1440/1920 widths.
- [ ] Mobile layout works at 360/390 widths.
