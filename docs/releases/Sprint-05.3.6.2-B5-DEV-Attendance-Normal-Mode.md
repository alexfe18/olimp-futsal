# Sprint 05.3.6.2 — B.5 DEV Attendance Normal Mode

B.5 introduces `ATTENDANCE_WRITE_MODE=dev` for normal authenticated attendance QA in the isolated DEV Supabase project.

Modes:
- `disabled` — suppress writes.
- `test` — preserve exact B.4 player/training target.
- `dev` — authenticated player writes only, and only when the existing login environment guard proves a development/preview app targeting isolated DEV Supabase.
- `live` — existing Vercel Production-only behavior remains unchanged.

No SQL migration and no Production deployment are part of B.5.
