# B.6.4.1.1 — Timer Type Hotfix

## Reason
The B.6.4.1 installer reached TypeScript and failed because the browser result of
`window.setTimeout()` is a number, while the declared timer type resolved to
`Timeout` in the project's mixed DOM/Node type environment.

## Fix
`authReloadTimer` is explicitly typed as `number | null`.

## Safety
- Resume-safe after the partially installed B.6.4.1 state.
- No SQL.
- No RLS changes.
- No attendance logic changes.
- Auth-session synchronization logic from B.6.4.1 is preserved.
- Push remains disabled.
