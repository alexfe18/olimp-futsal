# B.6.4.2 — Auth Persistence Hardening

## Findings
The current browser client used a plain `createClient(url, key)` and relied on implicit auth defaults.
The login page also ignored the `?next=/training` return destination and always redirected a player to `/player`.
`PlayerAccessGate` handled every empty auth event as a logout and could race its own startup verification.

## Changes
- Explicit browser auth configuration:
  - `persistSession: true`
  - `autoRefreshToken: true`
  - `detectSessionInUrl: true`
  - project-scoped storage key
- Stable browser Supabase singleton during DEV HMR.
- Login verifies that the session exists after sign-in.
- Safe `?next=` handling; `/training` now returns directly to `/training`.
- Successful auth transition uses a full browser navigation after persistence verification.
- `PlayerAccessGate` ignores `INITIAL_SESSION` because startup verification already owns initialization.
- Supabase work triggered by later auth events is deferred outside the auth callback.
- `/training` diagnostics now include auth event names and remaining JWT lifetime.

## Safety
- No SQL migration.
- B.6.4 RLS remains unchanged.
- Attendance write mode remains DEV.
- Push remains disabled.
