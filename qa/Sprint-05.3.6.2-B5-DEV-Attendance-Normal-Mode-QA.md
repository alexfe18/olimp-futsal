# Sprint 05.3.6.2 — B.5 DEV Attendance Normal Mode QA

After installer PASS, restart `npm run dev`.

Use DEV Player #99 with an active scheduled DEV training other than B4.

Browser smoke:
1. `Буду` -> reload -> persists.
2. `Під питанням` -> reload -> persists.
3. `Не буду` -> reload -> persists.
4. Terminal logs `[attendance] SAVED` with `runtime: local`, `mode: dev`, `authenticated: true`.
5. Final DB state: exactly one row, status `no`, authenticated `responded_by_profile_id`, no duplicates.
6. DEV `push_subscriptions = 0`.

Safety:
- anonymous requests do not receive `dev_write`;
- DEV mode is denied in Production runtime or invalid Supabase target;
- test exact-target mode remains available;
- live Vercel Production guard remains intact.
