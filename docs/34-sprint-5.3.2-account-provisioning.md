# Sprint 05.3.2 — Account Provisioning

Release: `0.6.0-alpha.3`

## Goal

Create the adult-team player Auth accounts prepared in Sprint 05.3.1 and link them to the new RBAC/team foundation without changing sporting availability.

Approved pilot baseline:

- 19 adult-team players;
- 18 Auth accounts to provision;
- 1 player without an account request — Сокур Дмитро Юрійович;
- Григор’ян Едуард remains `players.is_active = false` but keeps an active adult-team access membership and receives an account.

## Identity chain after provisioning

```text
auth.users
  -> profiles
      -> user_roles(member)
      -> team_memberships(player, adult)
          -> players
      -> player_contacts
```

The player card and account remain separate entities. Sporting availability is represented by `players.is_active`; access to the adult team is represented by `team_memberships.status`.

## Auth strategy

Player accounts are phone-only Supabase Auth users created through the Admin API with:

- club-verified E.164 phone;
- `phone_confirm = true`;
- generated temporary password;
- `must_change_password = true` in profile metadata/profile state;
- no email requirement and no confirmation email;
- `app_metadata.provisioning_source = sprint-05.3.2`.

Temporary passwords are written only to a local private credential ledger under `private-imports/generated/`. The directory is ignored by Git.

## Safety design

Provisioning is split into two phases:

1. Create all 18 Auth users.
2. Finalize all profile/contact/membership/role links in one database RPC transaction.

If Auth creation fails before phase 2, all Auth users created by the current run are deleted automatically. If database finalization fails, the SQL transaction rolls back and the newly created Auth users are deleted automatically.

The private credential ledger is created before account creation starts so a temporary password is not lost if the local process is interrupted.

## Database migration

`sql/2026-08-07-sprint-05.3.2-account-provisioning.sql` adds two service-role-only RPCs:

- `finalize_player_account_provisioning_batch(jsonb)` — atomically finalizes the 18 account links;
- `prepare_player_account_deprovisioning_batch(uuid[])` — recovery-only unlink/reset step before deleting Auth users.

Neither function is executable by `anon` or `authenticated`.

## Provisioning result

Expected final state:

```text
auth.users                         19
profiles                           19
player Auth users                  18
phone-confirmed player users       18
player_contacts                    19
contacts provisioned               18
contacts prepared                   0
accounts not requested              1
adult memberships                  19
active adult memberships           19
memberships linked to profiles     18
member global-role assignments     18
```

## Deferred to later Sprint 05.3.x stages

- player-facing login UI;
- mandatory password-change UX;
- role-aware application routing;
- replacing current client-only AdminShell authorization;
- player Training Plan visibility;
- youth/guardian account provisioning.
