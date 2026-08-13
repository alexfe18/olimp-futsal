# Sprint 05.3.6.2 — B.6.1 Player Shell & Dashboard

## Goal
Replace the temporary Player Home cards with the first production-shaped Player Area dashboard and introduce a shared navigation shell for authenticated player routes.

## Delivered
- Shared Player Area navigation inside the existing `PlayerAccessGate`.
- Desktop navigation for currently implemented routes only.
- Mobile bottom navigation foundation for currently implemented routes only.
- Dashboard HERO with real player/team identity from `get_my_access_context`.
- Nearest published scheduled training loaded through the existing player training visibility layer.
- Up to three additional upcoming trainings when data exists.
- Real loading, error and empty states.
- Existing Admin link remains conditional on `can_access_admin`.
- Removed the user-visible internal "next player-area sprints" placeholder.

## Intentional scope
B.6.1 does not create broken future links. Calendar, Matches, Statistics and Profile are added only when their routes exist.

B.6.1 does not change:
- attendance write mode;
- training visibility rules;
- database schema/RLS;
- Push configuration;
- Production.
