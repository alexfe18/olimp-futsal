# Sprint 05.3.7 Phase A — QA

## Automated
Installer must PASS:
- branch/version/source-shape guard;
- static verifier;
- `npm run typecheck`;
- `npm run build`.

## `/player/calendar`
1. Route opens only through existing PlayerAccessGate.
2. Active navigation item is `Календар`.
3. Current month opens.
4. Previous / next month buttons work.
5. `Сьогодні` returns to current month/day.
6. Training on 13 Aug 2026 appears on the calendar.
7. Selecting that day shows `Командне тренування`, 19:00 and `ФОК Олімп`.
8. `Деталі` opens the existing `/player/trainings/[id]` page.
9. A day without events shows a clean empty state.
10. Mobile 402px grid stays inside viewport and bottom nav does not cover content.

## Dashboard
1. Hero CTA is `Календар →`.
2. `Найближча подія` shows the same next training through the unified calendar
   projection.
3. `Наступні події` is used instead of training-specific dashboard wording.
4. Quick actions include Calendar, Trainings and Profile.

## Regression
- `/player/trainings` unchanged.
- training RSVP/detail unchanged.
- `/training` Protected Team Attendance Board unchanged.
- session persistence remains stable.
- `ATTENDANCE_WRITE_MODE=dev`.
- `PUSH_SEND_MODE=disabled`.
