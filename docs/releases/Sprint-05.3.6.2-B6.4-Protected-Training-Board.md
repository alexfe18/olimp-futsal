# Sprint 05.3.6.2 — B.6.4 Protected Team Attendance Board

## Goal

Convert `/training` from the legacy public player-selector workflow into a protected Team Attendance Board while preserving it as an alternative RSVP entry point.

## Final access model

### Anonymous viewer

- may open `/training`;
- may see the active scheduled training;
- may see aggregate `Будуть / Під питанням / Не будуть` counts;
- does **not** receive attendance names from `training_attendance`;
- cannot submit RSVP;
- receives the `Ви гравець Олімп Футзал?` login gate when attempting to respond.

### Authenticated active team player

- sees the full attendance board with names;
- is automatically identified from the authenticated profile/team membership;
- may submit `Буду / Під питанням / Не буду` directly on `/training`;
- uses the same `/api/attendance/respond` and `training_attendance` source of truth as Player Area;
- RSVP changes stay synchronized with `/player/trainings` and training detail.

### Staff / owner

Authenticated staff with attendance permissions retain authenticated read access to attendance rows.

## Security changes

- removed legacy `Public can read attendance` RLS policy;
- removed direct `anon` table privileges from `training_attendance`;
- added authenticated team-aware SELECT policy;
- added `get_training_attendance_board(uuid)` SECURITY DEFINER RPC which returns counts to anonymous viewers and names only to authorized viewers;
- `respond_to_player_training` and legacy `respond_to_training_public` are no longer executable by `anon` or normal `authenticated` clients; server `service_role` remains allowed;
- `/api/attendance/respond` now requires a valid authenticated player session.

The legacy `respond_to_training_public` function remains in the database only as a compatibility fallback for controlled server-side use. It is no longer a public voting endpoint.

## Player profile polish

The UI label `Членство` becomes `Статус у команді`. Current active membership is displayed as `У складі команди`. This keeps technical membership as an internal access concept while presenting a sports-oriented status to the player.

## Login return

The `/training` gate stores a one-time session return target. After the standard player login redirects to `/player`, Player Dashboard immediately returns the player to `/training`.

## Environment safety

B.6.4 is installed and QA-tested in isolated DEV first.

- `NEXT_PUBLIC_APP_ENV=development`
- `ATTENDANCE_WRITE_MODE=dev`
- `PUSH_SEND_MODE=disabled`

No Production deployment is part of this block.
