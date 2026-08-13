# Sprint 05.3.6.1 — PROD Attendance Hotfix QA

After the SQL returns PASS-like verification:

1. Open live `/training` in Incognito / logged-out state.
2. Select **your own** player profile.
3. Choose `Буду`, `Під питанням`, or `Не буду` and submit.
4. Expect success.
5. Reload and confirm the saved response remains.
6. Change the response once and submit.
7. Reload and confirm the changed response remains.
8. In Supabase Logs, verify the latest attendance write is no longer rejected
   with `401 / 42501 / new row violates row-level security policy`.

This compatibility layer is temporary. After service restoration, move the
live public submit path to `respond_to_training_public` and remove these two
policies with the rollback SQL.
