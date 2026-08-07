# Sprint 05.3.1 — Users, Roles & Teams Database Foundation

## Статус

Release candidate: `0.6.0-alpha.2`

Цей етап додає робочу модель даних для користувачів, ролей, дозволів, команд і memberships без зміни поточного UI та без створення акаунтів гравців.

## Що створено

Нові таблиці:

- `profiles` — бізнес-профіль для кожного `auth.users`;
- `teams` — реальні команди клубу;
- `roles` — global/team system і майбутні custom roles;
- `permissions` — атомарний каталог дозволів;
- `role_permissions` — permission set ролі;
- `user_roles` — глобальні ролі користувача;
- `team_memberships` — roster/staff конкретної команди;
- `player_contacts` — приватні перевірені контакти;
- `guardian_player_links` — основа для дитячих команд;
- `invitations` — email/phone onboarding foundation;
- `audit_log` — append-only журнал критичних дій.

## Adult-team pilot

Створюється одна канонічна команда:

```text
code: adult
name: Олімп Футзал
category: Доросла команда
age_group: Дорослі
```

Усі 19 поточних `players` отримують active membership з team-role `player`. `players.is_active` залишається окремим спортивним статусом доступності: травмований гравець може бути `is_active=false`, але мати active membership і майбутній акаунт. Номер форми копіюється з картки гравця.

## Team ID compatibility

До таблиць додається `team_id`:

- `training_plans`;
- `trainings`;
- `training_templates`;
- `training_plan_events`.

Поточний `team_name` не видаляється. Compatibility trigger:

- визначає adult `team_id`, коли старий UI/RPC передає `Олімп Футзал`, `Олімп`, `adult`, `Дорослі` або `Доросла команда`;
- заповнює snapshot `team_name`, коли новий код передає `team_id`;
- не змінює Plan ↔ Training UUID та lifecycle.

## Auth bootstrap

- Існуючі `auth.users` backfill у `profiles`.
- Якщо існує рівно один Auth user, він автоматично отримує system role `owner`.
- Якщо Auth users більше одного, migration зупиняється і вимагає явно вказати `v_initial_owner_id`.
- Trigger на `auth.users` створює profile для нових Auth users.
- Player Auth accounts у 05.3.1 не створюються.

## Permission model

System global roles:

- `owner`;
- `administrator`;
- `club_manager`;
- `content_manager`;
- `statistician`;
- `member`.

System team roles:

- `head_coach`;
- `assistant_coach`;
- `team_manager`;
- `player`;
- `guardian`.

System role code/scope не можна змінити, system role не можна видалити. Останнього активного Owner не можна деактивувати або зняти.

## RLS scope

RLS увімкнено для нових foundation tables. Дозвіл перевіряється через функції `app_private`:

- `is_active_profile()`;
- `has_global_permission(code)`;
- `has_team_permission(code, team_id)`;
- `is_team_member(team_id)`;
- `is_player_self(player_id)`;
- `is_guardian_of(player_id)`;
- `can_read_team_data(team_id)`;
- `can_manage_team_data(code, team_id)`.

Broad policies існуючих модулів у 05.3.1 не видаляються. Їх cutover виконується після Server Auth & Authorization та Module Integration.

## Private contact import

Реальні телефони не входять у Git або release ZIP.

Dry-run:

```bash
npm run import:player-contacts -- \
  --file private-imports/adult-team-contacts.csv
```

Apply після SQL migration і verification:

```bash
npm run import:player-contacts -- \
  --file private-imports/adult-team-contacts.csv \
  --apply \
  --confirm IMPORT_CONTACTS
```

Import:

- upsert 19 `player_contacts` після додавання нового гравця до приватного CSV;
- залишає 18 контактів у `prepared` для майбутнього provisioning, включно з травмованим гравцем;
- залишає Сокура Дмитра `not_requested`;
- оновлює adult-team player memberships;
- не створює `auth.users`;
- записує лише aggregate audit без телефонів.

## SQL порядок

1. `sql/2026-08-05-sprint-05.3.1-preflight.sql`
2. Backup DB / policies.
3. `sql/2026-08-05-sprint-05.3.1-database-foundation.sql`
4. `sql/2026-08-05-sprint-05.3.1-verification.sql`
5. Contact import dry-run.
6. Contact import apply.
7. Verification SQL і `npm run verify:db-foundation` повторно.

## Rollback principle

Migration additive. Legacy columns/policies/functions не видаляються. При проблемі:

- не запускати contact apply;
- не підключати нові tables у UI;
- зберегти нові foundation tables для аналізу;
- виконувати destructive rollback лише з backup і окремим approved SQL.

## Exit criteria

- один active adult team;
- 11 system roles;
- permission catalog seeded;
- мінімум один active Owner;
- 19 active adult roster memberships;
- всі legacy `Олімп Футзал` / `Дорослі` plans/trainings/templates мають `team_id`;
- 19 contacts після private import;
- 18 contacts prepared, 0 Auth accounts provisioned;
- new-table RLS enabled;
- existing Training/Attendance/Push regression PASS.
