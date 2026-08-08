# Sprint 05.3.2 — Rollback & Recovery

## Before provisioning

Create a fresh PostgreSQL custom-format backup before the 05.3.2 SQL migration and keep the Sprint 05.3.1 contact checkpoint.

The migration only adds service-role functions. It creates no Auth users.

## Automatic apply rollback

`provision-player-accounts.mjs` creates all Auth users before finalizing DB links. If account creation or finalization fails during the same run, every Auth user created by that run is deleted automatically.

The SQL finalizer is transactional, so a failed batch does not leave partial contact/membership/member-role links.

## Recovery after a successful batch

Use the generated private credentials ledger and the explicit rollback tool only if the verified batch must be reversed:

```bash
npm run rollback:player-accounts -- \
  --file private-imports/generated/<credentials-file>.csv \
  --confirm ROLLBACK_05_3_2
```

The recovery flow:

1. resets provisioned contacts to `prepared`;
2. removes profile links from adult player memberships while keeping membership access status `active`;
3. disables the global `member` assignment;
4. archives the profile pending Auth deletion;
5. deletes the 18 player Auth users through the Admin API.

The Owner account is not part of the credentials ledger and is never targeted.

## Never commit

Do not commit or share:

- `private-imports/adult-team-contacts.csv`;
- `private-imports/generated/*`;
- database dumps;
- temporary passwords;
- service-role keys.
