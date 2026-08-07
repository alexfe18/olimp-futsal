# Sprint 05.3.1 — Database Foundation QA Checklist

## A. Preflight

- [ ] DB backup/export completed.
- [ ] Preflight SQL returns 19 players: 18 active / 1 inactive.
- [ ] No orphan Attendance or Push player references.
- [ ] `auth.users` count is known.
- [ ] If more than one Auth user exists, `v_initial_owner_id` is explicitly configured.
- [ ] Legacy adult-team values are recognized: `Олімп Футзал` and `Дорослі`.

## B. Foundation migration

- [ ] Migration completes in one transaction.
- [ ] Re-running migration completes without duplicate roles/permissions/memberships.
- [ ] `teams` contains one active `adult` team.
- [ ] `profiles` count equals `auth.users` count.
- [ ] At least one active owner assignment exists.
- [ ] 11 system roles exist.
- [ ] Permission catalog contains at least 70 active codes.
- [ ] System role code/scope cannot be changed.
- [ ] System role cannot be deleted.
- [ ] Last active Owner cannot be disabled or deleted.
- [ ] `audit_log` rejects UPDATE and DELETE.

## C. Team mapping and compatibility

- [ ] 19 players have adult-team `player` membership.
- [ ] `team_memberships.status=active` for all 19 current team members; `players.is_active` remains the separate sporting/availability status.
- [ ] Membership shirt number mirrors `players.shirt_number`.
- [ ] Existing plans receive adult `team_id`.
- [ ] Existing trainings receive adult `team_id`, including the legacy `Дорослі` row.
- [ ] Existing templates receive adult `team_id`.
- [ ] Existing Training Plan events inherit plan `team_id`.
- [ ] Saving through current UI with only `team_name` automatically fills `team_id`.
- [ ] Saving a new row with `team_id` and blank `team_name` fills the snapshot name.
- [ ] Plan ↔ Training UUID relationship remains unchanged.

## D. Private contact import

- [ ] Dry-run: 19 rows, 19 matches, 0 invalid (after the new player is added to the private CSV).
- [ ] Dry-run masks every phone in generated reports.
- [ ] Apply requires `--apply --confirm IMPORT_CONTACTS`.
- [ ] Apply creates/updates 19 contacts.
- [ ] 18 contacts have `account_requested=true` and `prepared`, including the injured player.
- [ ] 1 contact has `not_requested`.
- [ ] 19 primary phone values are unique; every login-enabled phone is club-verified.
- [ ] No `auth.users` rows are created.
- [ ] Audit record contains counts but no phone values.
- [ ] `private-imports/` and `audit-output/` are absent from `git status`.

## E. RLS and negative checks

- [ ] anon cannot read any new foundation table.
- [ ] current Owner can read every foundation table.
- [ ] profile can read own profile.
- [ ] inactive/suspended profile fails helper checks.
- [ ] non-owner cannot assign Owner.
- [ ] team role helper returns true only for its own `team_id`.
- [ ] direct UPDATE/DELETE to `audit_log` fails.
- [ ] service-role contact RPC works; authenticated invocation is denied.

## F. Regression

- [ ] Admin login still works.
- [ ] Players list loads.
- [ ] Training Plans load/save.
- [ ] Plan schedule/publish remains functional.
- [ ] Trainings list and lifecycle remain functional.
- [ ] Attendance loads and saves.
- [ ] Existing Push subscribe/send remains functional.
- [ ] `npm run typecheck` PASS.
- [ ] `npm run build` PASS on Node 22.
