# Sprint 05.2.1 — Plan ↔ Training Integration QA Checklist

## Prerequisites

- [ ] Sprint 05.0, 05.1 and 05.2 migrations are already applied.
- [ ] `2026-08-04-plan-training-integration-ux-completion.sql` completes successfully.
- [ ] Local `.env.local` contains Supabase and Push variables.
- [ ] Test browser has an active Push subscription.

## Draft → Planned

- [ ] A draft without date/time/location can be saved.
- [ ] A draft does not create a row in `trainings`.
- [ ] Planning requires date, time, location, team and at least one block.
- [ ] Planning creates exactly one inactive training on the selected day.
- [ ] The plan receives the created `training_id`.
- [ ] The planned training appears in `/admin/trainings` but not on `/training`.
- [ ] Repeated planning updates the same training UUID.

## Planned → Published

- [ ] Publishing activates the existing linked training.
- [ ] Publishing does not create a duplicate training.
- [ ] The plan status becomes `published`.
- [ ] The player page displays the active event.
- [ ] Date, time, location and team are correct.
- [ ] Publication sends Push after the database operation succeeds.

## Bidirectional editing

- [ ] Training → Plan opens the correct plan.
- [ ] Plan → Training scrolls to and highlights the correct training card.
- [ ] Attendance links from both places use the same UUID.
- [ ] Linked training title is read-only in the event editor.
- [ ] Training card shows plan title, objective, duration, block count and team.
- [ ] Editing date/time/location/team in `/admin/trainings` updates the plan.
- [ ] Editing those fields in Training Builder updates the linked training.
- [ ] Editing only exercises/blocks keeps the same training UUID.
- [ ] Editing only methodology does not send Push.

## Push notifications

- [ ] Date/time change sends a reschedule notification with previous and new time.
- [ ] Location change sends the new location.
- [ ] Team change sends the new team.
- [ ] Active cancellation sends the reason.
- [ ] Restoring a previously active event reactivates it and sends Push.
- [ ] Push failure shows a warning but does not roll back saved data.
- [ ] Planned/inactive event edits do not send Push.
- [ ] Saving an active event without organizational changes does not send Push.

## Lifecycle

- [ ] Unpublish keeps the event and Attendance but makes it inactive.
- [ ] Cancellation requires a non-empty reason.
- [ ] Cancelled status and reason match in Plan and Training.
- [ ] Restoring a previously inactive planned event returns it to planned/inactive.
- [ ] Completing a training completes the linked plan and keeps Attendance.
- [ ] Deleting the training preserves the linked plan as planned.
- [ ] Deleting an allowed plan removes its linked training according to confirmation rules.

## Manual training regression

- [ ] `+ Нове тренування` still works without a plan.
- [ ] Manual title, date, time, location and team are editable.
- [ ] Manual activation and deactivation work.
- [ ] Manual cancel/restore/complete/delete work.

## UI and regression

- [ ] No action is labelled as the future general club calendar.
- [ ] Desktop layout is stable.
- [ ] Mobile layout is usable without horizontal overflow.
- [ ] Exercise Library, Templates and Training Builder still load.
- [ ] Existing Production data remains readable.
