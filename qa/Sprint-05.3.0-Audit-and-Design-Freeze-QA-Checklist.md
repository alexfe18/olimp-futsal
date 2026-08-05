# Sprint 05.3.0 — QA Checklist

## Private import

- [ ] Real CSV is stored under `private-imports/`.
- [ ] `git status --short` does not show the real CSV.
- [ ] 18 roster rows are detected.
- [ ] 14 active and 4 inactive players are reported.
- [ ] 17 account candidates and 1 no-account row are reported.
- [ ] All phones normalize to `+380XXXXXXXXX`.
- [ ] Duplicate phone count is zero.
- [ ] Duplicate normalized-name count is zero.
- [ ] Account candidates are club-verified and allowed for login.

## DB matching

- [ ] `.env.local` contains server-only `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] 18/18 rows match existing `players`, or every exception is reviewed.
- [ ] Script performs no inserts, updates, deletes or Auth operations.
- [ ] Reports remain ignored by Git.

## Team mapping

- [ ] `trainings.team_name` values exported.
- [ ] `training_plans.team_name` values exported.
- [ ] `training_templates.team_name` values exported.
- [ ] Every legacy value is confirmed as the adult team or documented as an exception.
- [ ] Canonical code/name/category are approved.

## RLS/Auth audit

- [ ] Current Auth user count recorded.
- [ ] Initial owner account identified privately.
- [ ] RLS-enabled state recorded for protected tables.
- [ ] Existing `anon`/`authenticated` policies and grants exported.
- [ ] Orphan attendance, push and plan-training link counts are zero.

## Security

- [ ] No phone numbers exist in committed files.
- [ ] Service-role key is absent from browser code and Git.
- [ ] SQL audit is read-only.
- [ ] No real Auth users are created in 05.3.0.
