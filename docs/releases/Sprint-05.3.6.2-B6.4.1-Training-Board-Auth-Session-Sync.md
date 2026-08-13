# B.6.4.1 — Training Board Auth Session Sync Hotfix

## Symptom
After anonymous `/training` → login → return to `/training`, a valid DEV Player session could still see the anonymous protected-board card.

## Fix
- Wait for `supabase.auth.getSession()` before the initial board request.
- Ignore the competing `INITIAL_SESSION` event because bootstrap already handles it.
- Defer later auth-triggered data reloads outside the Supabase auth callback.
- Add safe console diagnostics for session and board viewer state.
- Show a distinct authenticated-but-no-player-access state if the session is valid but membership/permission resolution fails.

## Safety
- No SQL migration.
- No RLS changes.
- No attendance write logic changes.
- Existing protected board RPC and `/api/attendance/respond` stay unchanged.
- Push remains disabled.
