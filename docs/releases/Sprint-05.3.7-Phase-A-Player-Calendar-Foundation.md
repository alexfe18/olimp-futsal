# Sprint 05.3.7 — Phase A: Player Calendar Foundation

## Architecture decision

The calendar is a projection layer, not a duplicate source-of-truth table.

Current canonical source:
- `trainings`

The UI maps source rows into a shared `PlayerCalendarEvent` contract containing:
- source type;
- source id;
- title;
- start/end;
- location;
- team;
- status;
- destination URL.

This keeps a training as a training. When Matches are enabled for Player Area,
their rows will be adapted into the same calendar contract instead of copied.

A future native `club_events` table should be introduced only for events that do
not already have another canonical entity (for example organizational meetings,
club trips or gatherings).

## Phase A delivery
- New protected route `/player/calendar`.
- Month navigation: previous / today / next.
- Monday-first month grid.
- Kyiv date/time presentation.
- Training markers in the calendar.
- Selected-day agenda.
- Upcoming events list for the visible month.
- Player navigation expands to Home / Calendar / Trainings / Profile.
- Dashboard now consumes the unified calendar projection and labels the primary
  card as `Наступна подія`.
- Dashboard gains a Calendar quick action.

## Data/security
- No SQL migration.
- Existing `trainings` RLS remains the security boundary.
- Player calendar uses the same team + active + scheduled filters as Player
  Training Visibility.
- No Matches route is exposed before a safe Player Matches read model exists.
- Attendance writes are untouched.
- Push is untouched and remains disabled in DEV.
