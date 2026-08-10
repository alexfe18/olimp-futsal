# Sprint 05.3.6 — Player Attendance Integration

Release: `0.6.0-alpha.8`

## Goal

Connect the authenticated player area to the existing `training_attendance`
model without creating a second attendance system.

Player flow:

`/player/trainings/[trainingId]`
→ current RSVP
→ **Буду / Не буду**
→ save / change own response.

## Security

The authenticated player never submits a `player_id` as trusted identity.
The server validates the Supabase access token and resolves:

`profile -> active team membership -> player`.

The database service RPC validates the same profile/team/training relationship
before the RSVP row is inserted or updated.

RSVP updates preserve coach-owned fields:

- `actual_status`
- `coach_note`
- `marked_at`

## Legacy `/training`

The public attendance page remains available without login, but browser writes
are moved from direct Supabase table writes to `/api/attendance/respond`.

The public page still reads the active training and RSVP list as before.

## Local / Preview attendance safety

Attendance writes now have environment modes:

- `disabled` — default; no DB write.
- `test` — writes only for one explicitly configured player + training.
- `live` — allowed only on Vercel Production.

Variables:

- `ATTENDANCE_WRITE_MODE`
- `ATTENDANCE_TEST_PLAYER_ID`
- `ATTENDANCE_TEST_TRAINING_ID`

Recommended:

- Local: unset / `disabled`
- Preview: `disabled`
- Controlled QA: `test`
- Production release: `live`

## Production note

This sprint is backward-compatible at the data-model level, but after its code
is deployed the public RSVP page depends on the Next.js attendance API.
Production must therefore have `ATTENDANCE_WRITE_MODE=live` before the release
deployment intended for real player responses.
