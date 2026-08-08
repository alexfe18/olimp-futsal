# Sprint 05.3.2.3 — Auth Confirmation Sync

## Root cause

The 05.3.2.2 phone normalization hotfix fixed the `profiles_phone_check`
failure and allowed `admin.createUser()` to complete.

The single-user test then exposed a second, independent timing issue:

- the profile INSERT trigger runs while the Auth row can still be unconfirmed;
- `phone_confirm: true` may populate `phone_confirmed_at` as part of a later
  update in the same Auth flow;
- the existing trigger only listened to INSERT, so the profile remained
  `account_status = invited`.

## Fix

- preserve the strict E.164 normalization;
- keep the existing AFTER INSERT profile creation trigger;
- add a narrow AFTER UPDATE trigger for
  `email_confirmed_at` / `phone_confirmed_at`;
- promote only `invited -> active`;
- never reactivate `suspended` or `archived` profiles.

## Validation

Use the included single-user test. It creates one temporary player Auth user,
verifies `phone_confirmed_at` and profile `account_status = active`, then
automatically deletes the temporary user and verifies rollback.
