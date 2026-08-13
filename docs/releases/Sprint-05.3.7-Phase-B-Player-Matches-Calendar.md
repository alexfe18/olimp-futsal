# Sprint 05.3.7 Phase B — Player Matches + Calendar Polish

## DB foundation
- `matches.team_id` and `competitions.team_id` become canonical app-team scope.
- Current adult-only admin UI remains compatible through a temporary adult-team fallback trigger.
- Broad `authenticated USING true` policies are replaced with permission/team-scoped RLS.
- Anonymous access to Matches / Competitions / Opponents / Match Stats is removed.
- TRUNCATE / REFERENCES / TRIGGER privileges are removed from authenticated users.
- Player team role keeps read access through existing `matches.read` / `competitions.read`.
- Match stats direct read supports staff team stats and player OWN rows.

## Player Matches
New routes:
- `/player/matches`
- `/player/matches/[matchId]`

Player sees:
- upcoming matches;
- completed history;
- opponent;
- competition and round;
- date/time/location;
- home/away/neutral;
- score and result when completed.

Internal admin notes/report fields are intentionally not exposed in Phase B.

## Calendar integration
The unified PlayerCalendarEvent projection now accepts:
- Training
- Match

Dashboard `Наступна подія` therefore naturally chooses the chronologically nearest event across both source types.

## Calendar Polish
- Fixes `Серпень 2026 Р.` by capitalizing only the first month character.
- Adds extra mobile safe-space above bottom navigation.
- Click day -> smooth scroll to `Події дня`.
- Desktop event chip -> full tooltip.
- Click event -> event preview.
- Mobile preview uses bottom-sheet behavior.
- Preview CTA opens the canonical Training/Match detail route.
- Training and Match use different event accents.

## Scope
Pilot remains adult team only.
The fallback trigger exists only to keep the current adult-only Admin Matches UI compatible until multi-team admin selectors are implemented.
