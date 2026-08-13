# Sprint 05.3.6.2 — B.6.1.1 UI Polish + B.6.2 Player Profile Foundation

## B.6.1.1
- Removed the duplicate `Кабінет гравця` eyebrow from the `/player` HERO.
- The shared Player Area header remains the single permanent `Кабінет гравця` identifier.
- Added Profile as a real working Player Area destination.

## B.6.2
New route: `/player/profile`.

The page uses the authenticated Player Access Context for identity/team/account state and loads the linked player row by the authenticated context's `player.id`.

Sports profile fields:
- player photo when available;
- jersey number;
- position;
- team;
- sporting active/inactive state;
- membership state.

Account section:
- account status;
- current authenticated sign-in method (email or phone);
- current sign-in identifier.

## Safety
- No database migration.
- No write to `players`, `profiles`, memberships, attendance or auth data.
- Player profile lookup is scoped to the player ID already returned by authenticated `get_my_access_context`.
- Existing PlayerAccessGate remains unchanged.
- Attendance mode and Push mode are not changed.
- No Production deployment is part of this milestone.
