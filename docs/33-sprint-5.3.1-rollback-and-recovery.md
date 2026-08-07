# Sprint 05.3.1 — Rollback & Recovery Guide

## Principle

The migration is additive. Existing `team_name`, current Training RPCs, current Push `player_id` and legacy RLS policies are retained. Therefore the first recovery action is to stop the rollout, not to drop the new tables.

## Before migration

1. Export/backup database.
2. Save current `pg_policies` and grants.
3. Run the preflight SQL.
4. Confirm the initial Owner UUID when more than one Auth user exists.

## Failure during foundation SQL

The migration runs inside one transaction. A SQL error before `commit` rolls back the foundation changes automatically.

After a failure:

```text
Do not run contact apply.
Save the SQL error and line number.
Confirm existing Players / Plans / Trainings still work.
Correct the migration and rerun from the beginning.
```

## Failure after successful foundation SQL

Do not remove the new schema immediately. The current application still uses legacy fields and policies.

1. Stop before 05.3.2 integration.
2. Do not import contacts until verification passes.
3. Confirm `team_name` operations still work through compatibility triggers.
4. Restore only from backup if the existing application is affected.

## Contact import failure

`apply_player_contact_foundation_import(jsonb)` is transactional. A failed RPC rolls back the full batch.

If an incorrect but successful batch must be reversed before accounts are provisioned:

```sql
update public.player_contacts
set is_active = false,
    provisioning_status = 'cancelled',
    archived_at = now(),
    updated_at = now()
where provisioned_profile_id is null;
```

Do not delete provisioned contact history after Auth account creation; use an audited archive/correction flow.

## Destructive rollback

Dropping foundation tables/columns is not included in the normal package because it can remove role assignments, contacts and audit history. A destructive rollback must be generated from the actual post-migration schema and approved against a backup.
