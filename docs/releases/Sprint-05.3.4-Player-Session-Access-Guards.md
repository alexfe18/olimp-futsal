# Sprint 05.3.4 — Player Session & Access Guards

Release: `0.6.0-alpha.5`

## Goal

Create one reusable access boundary for the entire `/player` route tree and align
player/admin route decisions so future Training Visibility, Calendar and
Attendance pages inherit the same session/access rules automatically.

## Implemented

- Added `app/player/layout.tsx` as the common protection boundary for
  `/player` and every future `/player/*` route.
- Added `PlayerAccessGate` with a shared verified `PlayerAccessContext`.
- Added `usePlayerSession()` so player pages do not repeat Auth/RPC checks.
- Added centralized route-decision helpers in `lib/auth/access-control.ts`.
- Refactored `AdminAccessGate` to use the same access rules.
- Preserved mandatory first-sign-in password change.
- Preserved player -> `/admin` redirect to `/player`.
- Added owner/admin -> `/player` redirect to `/admin` when no active player
  membership exists.
- Added Auth state handling for logout and user updates.
- Added static verification script and manual QA checklist.

## Access matrix

| State | `/player/*` | `/admin/*` |
|---|---|---|
| No session | `/login` | `/admin/login` |
| Account not active | sign out -> `/login` | sign out -> `/login` |
| Must change password | `/account/change-password` | `/account/change-password` |
| Active adult player membership | allow | `/player` |
| Admin/Owner without player membership | `/admin` | allow |
| No valid club access | sign out -> `/login` | sign out -> `/login` |

## Security boundary

This sprint provides route/session UX protection. It is not a replacement for
Supabase Row Level Security. Any player-visible Training, Calendar, Attendance
or Profile data added in later sprints must also be protected by RLS/database
authorization. Sensitive data must never rely on a client route guard alone.

## Database

No database migration is required for Sprint 05.3.4. It reuses the verified
Sprint 05.3.1-05.3.3 roles, memberships and `get_my_access_context()` function.
