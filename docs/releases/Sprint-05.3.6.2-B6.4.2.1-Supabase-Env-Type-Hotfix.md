# B.6.4.2.1 — Supabase Env Type Hotfix

## Problem
B.6.4.2 correctly guards both public Supabase environment variables at module
startup, but TypeScript did not preserve that narrowing inside
`createOlimpSupabaseClient()` and reported:

`Argument of type 'string | undefined' is not assignable to parameter of type 'string'.`

## Fix
After the existing runtime guards, the validated values are copied into explicit
`string` constants and those constants are used by the Supabase client factory.

## Safety
- Resume-safe from the partially installed `0.6.0-alpha.18` state.
- No SQL or RLS changes.
- No auth behavior rollback.
- B.6.4.2 persistence, storage key, `?next=/training`, HMR singleton and
  diagnostics are preserved.
- Attendance remains DEV and Push remains disabled.
