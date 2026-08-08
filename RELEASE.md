# Release 0.6.0-alpha.3 — Account Provisioning

Статус: Sprint 05.3.2 package ready for Production preflight, safe account provisioning and verification.

## Входит

- создание 18 phone-only Supabase Auth-аккаунтов игроков через Admin API;
- подтверждение клубом телефонных номеров без email confirmation flow;
- временные пароли только в локальном приватном credential ledger;
- `must_change_password = true`;
- глобальная роль `member`;
- linking `auth.users → profiles → player_contacts → team_memberships → players`;
- atomic database finalization after all Auth users are created;
- automatic Auth rollback if apply fails before successful finalization;
- exact 19 / 18 / 1 verification;
- recovery-only deprovisioning tool;
- SQL preflight, migration and verification.

## Не входит

- player login UI;
- password-change UI;
- role-aware routing/application shell;
- Team Plan Visibility;
- youth/guardian provisioning.

## SQL order

```text
sql/2026-08-07-sprint-05.3.2-preflight.sql
sql/2026-08-07-sprint-05.3.2-account-provisioning.sql
sql/2026-08-07-sprint-05.3.2-verification.sql
```

## Commands

```text
npm run provision:player-accounts
npm run provision:player-accounts -- --apply --confirm PROVISION_ACCOUNTS
npm run verify:account-provisioning
```
