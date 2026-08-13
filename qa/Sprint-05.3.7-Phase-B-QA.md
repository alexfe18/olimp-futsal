# Sprint 05.3.7 Phase B — QA

## DB
Run migration, then DB verify. Required:
`"pass": true`.

## DEV fixture
Because the Phase B preflight contains 0 matches, run the included DEV fixture SQL after DB verify.
Expected:
- upcoming `DEV Матч — майбутній`;
- completed `DEV Матч — завершений`.

## Player Matches
- `/player/matches` shows upcoming and history sections.
- Upcoming fixture shows 16 Aug 2026, 18:00, ФОК Олімп.
- Completed fixture shows 4 : 2 and `Перемога`.
- Detail route is team-scoped and opens both fixtures.
- No admin notes/report are rendered.

## Calendar
- August 2026 shows Training on 13 Aug.
- Match marker appears on 16 Aug.
- Match marker uses a different accent from Training.
- Hover a desktop event chip -> tooltip shows full title/time/location.
- Click a day -> smooth scroll to `Події дня`.
- Click event -> preview opens.
- Preview -> `Відкрити деталі` opens correct Training or Match.
- Month title reads `Серпень 2026 р.` — lowercase `р.`.
- On 402px the last calendar row can be scrolled fully above bottom navigation.
- Mobile event click opens bottom-sheet preview.

## Dashboard / navigation
- Navigation is Home / Calendar / Trainings / Matches / Profile.
- Dashboard `Наступна подія` chooses Training or Match by time.
- Quick access includes Matches.

## Regression
- Player Trainings RSVP/counts unchanged.
- `/training` Protected Team Attendance Board unchanged.
- Auth persistence remains stable.
- ATTENDANCE_WRITE_MODE=dev.
- PUSH_SEND_MODE=disabled.
