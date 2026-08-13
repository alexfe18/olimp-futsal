# Sprint 05.3.6.2 — B.6.3 Player Training Presentation

Version target: `0.6.0-alpha.14`

## Goal

Improve the authenticated Player Area without exposing the full roster inside the private dashboard.

Player Area shows:

- the player's own RSVP status;
- team response counts: `Будуть / Під питанням / Не будуть`;
- training date, time and location;
- no player-name roster inside `/player`.

The existing public `/training` experience remains the place for the full named attendance list.

## Scope

### `/player/trainings`

Each published training card now includes:

- `Найближче` for the first event;
- `Опубліковано`;
- the authenticated player's personal response:
  - `Ваша відповідь: Буду`;
  - `Ваша відповідь: Під питанням`;
  - `Ваша відповідь: Не буду`;
  - or `Ви ще не відповіли`;
- aggregate response counts:
  - `Будуть`;
  - `Під питанням`;
  - `Не будуть`.

### `/player/trainings/[trainingId]`

The existing authenticated RSVP flow is preserved.

The details page additionally shows team response counts after the personal response controls. It intentionally does not render player names.

After a successful RSVP change, the aggregate counters refresh from Supabase.

### `/player/profile`

Mobile account rows are polished so long email/phone identifiers use the available width and do not break into a single trailing character.

## Data / security notes

No DB migration is included in B.6.3.

The presentation query reads only:

- `training_id`;
- `player_id`;
- `status`.

It does not request `player_name`.

Attendance writes continue through the existing authenticated `/api/attendance/respond` route.

Expected local safe state:

- `NEXT_PUBLIC_APP_ENV=development`
- `ATTENDANCE_WRITE_MODE=dev`
- `PUSH_SEND_MODE=disabled`

## QA

1. Open `/player/trainings`.
2. Confirm the nearest published training is visible.
3. Confirm personal RSVP badge matches the saved response.
4. Confirm three counters are visible and contain only counts.
5. Open training details.
6. Change status:
   - `Буду`
   - `Під питанням`
   - `Не буду`
7. Confirm each change persists after reload.
8. Confirm the team counters refresh after each saved change.
9. Confirm no player names are shown in Player Area attendance summary.
10. Open `/player/profile` at ~402 px width and confirm the identifier wraps normally without a detached last character.
11. Confirm mobile bottom navigation does not cover page content.
12. Confirm Terminal logs attendance saves as:
    - `runtime: 'local'`
    - `mode: 'dev'`
    - `authenticated: true`
13. Confirm push remains disabled.

## Expected verifier result

`pass: true` with:

- `version_alpha_14`
- `list_loads_attendance_presentation`
- `detail_keeps_authenticated_rsvp`
- `detail_shows_counts_without_names`
- `presentation_query_is_minimal`
- `profile_mobile_identifier_polish`
- `local_development_app`
- `attendance_dev_mode`
- `push_disabled`
