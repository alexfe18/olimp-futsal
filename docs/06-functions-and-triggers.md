# Database Functions & Triggers

> Database Automation Documentation
> Version: 1.0
> Last updated: July 2026

---

# 1. Загальна інформація

У системі **«Олімп Футзал»** значна частина бізнес-логіки виконується безпосередньо на рівні PostgreSQL.

Для цього використовуються:

- PostgreSQL Functions;
- Database Triggers;
- автоматичне оновлення даних;
- підтримка цілісності інформації.

Це дозволяє централізувати логіку незалежно від клієнтської частини.

---

# 2. Загальна схема

```text
Admin Panel
      │
      ▼
Insert / Update
      │
      ▼
Database Trigger
      │
      ▼
SQL Function
      │
      ▼
Database Update
      │
      ▼
Public Website
```

---

# 3. Основні SQL Functions

## activate_training()

### Призначення

Активує вибране тренування.

### Використовується

- Admin Panel
- Trainings

### Результат

- встановлює тренування активним;
- деактивує попереднє активне тренування (за потреби);
- забезпечує відображення лише актуального тренування на публічній сторінці.

---

## recalculate_competition_standings()

### Призначення

Автоматично перераховує турнірну таблицю після зміни результатів матчів.

### Оновлює

- перемоги;
- нічиї;
- поразки;
- забиті м'ячі;
- пропущені м'ячі;
- різницю м'ячів;
- очки;
- позицію у таблиці.

---

## recalculate_olimp_standing()

### Призначення

Оновлює статистику команди «Олімп» після завершення матчу.

Використовується як допоміжна функція при оновленні турнірної таблиці.

---

## matches_recalculate_standings_trigger()

### Призначення

Запускає автоматичний перерахунок після створення або редагування матчу.

Не потребує ручного запуску.

---

## set_attendance_marked_at()

### Призначення

Автоматично встановлює дату та час підтвердження відвідуваності.

Використовується для поля:

```
training_attendance.marked_at
```

---

# 4. Database Triggers

Система використовує тригери для автоматичного виконання SQL Functions.

---

## Training Triggers

Відповідають за:

- активацію тренування;
- оновлення службових полів.

---

## Competition Triggers

Відповідають за:

- автоматичний перерахунок турнірної таблиці;
- підтримку актуальної статистики.

---

## Gallery Triggers

Відповідають за:

- автоматичне оновлення обкладинки альбому;
- синхронізацію фотографій;
- оновлення часу останньої зміни.

---

## Attendance Triggers

Автоматично:

- встановлюють marked_at;
- підтримують цілісність записів відвідуваності.

---

# 5. Автоматичні бізнес-процеси

## Створення тренування

```text
Адміністратор

↓

Створення тренування

↓

SQL Function

↓

Активне тренування

↓

Public Website

↓

PWA
```

---

## Внесення результату матчу

```text
Адміністратор

↓

Редагування матчу

↓

Trigger

↓

recalculate_competition_standings()

↓

Оновлення таблиці
```

---

## Підтвердження відвідуваності

```text
Гравець

↓

Відповідь

↓

Trigger

↓

marked_at

↓

Attendance
```

---

## Додавання фотографій

```text
Нове фото

↓

Gallery Trigger

↓

Оновлення Cover

↓

Gallery
```

---

# 6. Переваги використання Functions

Використання PostgreSQL Functions забезпечує:

- централізовану бізнес-логіку;
- мінімальне дублювання коду;
- автоматичне оновлення даних;
- однакову поведінку незалежно від клієнта;
- підтримку цілісності інформації.

---

# 7. Поточний стан

На момент створення документації система використовує:

- PostgreSQL Functions;
- Database Triggers;
- автоматичне оновлення турнірної таблиці;
- автоматичну обробку Attendance;
- автоматичну синхронізацію Gallery.

Усі механізми працюють у Production.

---

## Історія змін

| Версія | Дата        | Зміни             |
| ------ | ----------- | ----------------- |
| 1.0    | Липень 2026 | Створено документ |


---

# 6. Training Builder Functions

## save_training_plan_draft(...)

### Призначення

Атомарно створює або оновлює чернетку тренувальної сесії разом з упорядкованими блоками.

### Виконує

- перевіряє title, intensity, status і JSON blocks;
- вимагає мінімум один блок: вправу з бібліотеки або власний блок;
- обчислює `planned_duration` до створення рядка `training_plans`;
- створює або оновлює `training_plans`;
- замінює `training_plan_blocks` в одній транзакції;
- зберігає `exercise_id`, snapshot, duration, sort order і notes;
- перераховує `planned_duration`;
- повертає UUID плану.

### Безпека

Функція має `security invoker`. RLS-політики таблиць продовжують діяти для поточного authenticated user.

### Міграція

`sql/2026-08-03-training-builder-duration-and-layout-qa-fix.sql`

---

# 7. Training Templates Functions

## save_training_template_draft(...)

### Призначення

Атомарно створює або оновлює шаблон тренування разом з упорядкованими блоками.

### Виконує

- перевіряє title, intensity, template status і JSON blocks;
- вимагає мінімум один блок;
- обчислює `planned_duration` до створення parent row;
- створює або оновлює `training_templates`;
- замінює `training_template_blocks` в одній транзакції;
- зберігає optional `source_plan_id`;
- повертає UUID шаблону.

### Безпека

Функція має `security invoker`. RLS-політики таблиць діють для поточного
`authenticated` користувача.

### Міграція

`sql/2026-08-03-training-templates-and-plan-duplication.sql`

# Sprint 05.2 / 05.2.1 — Training Publish Flow RPC

## save_training_plan_draft_v2(...)

Versioned save flow з підтримкою дати, часу, місця, команди та повного lifecycle.
Для вже пов’язаного опублікованого плану синхронізує організаційні поля
конкретного тренування.

## schedule_training_plan(plan_id)

Переводить план у `planned`, створює або оновлює одну неактивну training-запис
на вибраний день. Повторний виклик не створює дублікат.

## sync_training_event_from_plan(plan_id)

Оновлює title, date/time, location і team у вже пов’язаному тренуванні. Для
`planned` plan може створити відсутню неактивну подію.

## publish_training_plan(plan_id)

Активує ту саму training-запис, синхронізує `training_id`, `published_at`,
`published_by` і створює Push outbox event. Нова публікація не створює дублікат.

## update_training_event_with_plan(training_id, title, starts_at, location, team_name)

Редагує організаційні поля у розділі «Тренування» та синхронізує дату, час,
місце й команду назад у Training Plan. Назва linked event береться з плану.

## activate_training_with_plan(training_id) / deactivate_training_with_plan(training_id)

Публікує або знімає з публікації конкретне тренування. Для linked plan статус
синхронізується як `published` або `planned`.

## cancel / restore / complete

`cancel_training_plan`, `cancel_training_with_plan`,
`restore_cancelled_training_plan`, `restore_training_with_plan`,
`complete_training_plan` і `complete_training_with_plan` синхронізують lifecycle
в обох напрямках, не видаляючи Attendance. Якщо скасоване активне тренування
відновлюється, воно знову активується та може відправити Push.

## delete_training_plan_with_training(...) / delete_training_with_plan(...)

Перший видаляє план разом із пов’язаним тренуванням за правилами lifecycle.
Другий видаляє тільки training event, зберігаючи linked plan як `planned`.

### Міграції

- `sql/2026-08-03-training-publish-flow.sql`
- `sql/2026-08-04-plan-training-integration-ux-completion.sql`
