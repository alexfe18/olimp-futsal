# Release 0.6.0-alpha.2 — Users, Roles & Teams Database Foundation

Статус: Sprint 05.3.1 package ready for Supabase preflight, migration and local/Preview regression.

## Входит

- profiles linked to Supabase Auth;
- global/team RBAC tables and protected system roles;
- atomic permission catalog;
- real `teams` and adult `Олімп Футзал` pilot;
- active access memberships for all 19 current players, independent from sporting availability;
- private player contact and account-preparation model;
- guardian/invitation foundation;
- append-only audit log;
- team_id compatibility for Plans, Trainings, Templates and plan events, including `Олімп Футзал` / `Дорослі` aliases;
- RLS helper functions for future server authorization;
- private contact dry-run/apply and verification scripts;
- Node.js 22 project requirement.

## Не входит

- создание Auth-аккаунтов игроков;
- Users/Roles/Teams UI;
- replacement of current AdminShell auth;
- removal of broad legacy module policies;
- youth teams;
- Team Plan Visibility.

## SQL order

```text
sql/2026-08-05-sprint-05.3.1-preflight.sql
sql/2026-08-05-sprint-05.3.1-database-foundation.sql
sql/2026-08-05-sprint-05.3.1-verification.sql
```

## Private import

The filled contact CSV stays only under `private-imports/` and is not part of this release archive.
