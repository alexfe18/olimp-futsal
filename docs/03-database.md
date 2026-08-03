# Database Overview

> Database Documentation
> Version: 1.0
> Last updated: July 2026

---

# 1. Загальна інформація

Система **«Олімп Футзал»** використовує **Supabase PostgreSQL** як основну базу даних.

База даних централізовано зберігає всі дані клубу та використовується одночасно:

- публічним сайтом;
- адміністративною панеллю;
- API Routes;
- Progressive Web App (PWA);
- системою Push Notification.

Усі модулі системи працюють з єдиною базою даних.

---

# 2. Технології

База даних побудована на основі:

- PostgreSQL
- Supabase Database
- Row Level Security (RLS)
- PostgreSQL Functions
- Database Triggers
- Foreign Keys
- Storage Buckets

---

# 3. Структура бази даних

На момент створення документації база містить:

| Компонент         | Кількість |
| ----------------- | --------: |
| Таблиць           |    **15** |
| Primary Keys      |    **15** |
| Foreign Keys      |    **20** |
| SQL Functions     |    **11** |
| Database Triggers |    **15** |
| RLS Policies      |    **54** |
| Storage Buckets   |     **3** |
| Storage Policies  |    **11** |

---

# 4. Основні таблиці

База даних складається з наступних функціональних модулів.

## Команда

- players

---

## Тренування

- trainings
- training_attendance

---

## Матчі

- matches
- match_player_stats

---

## Турніри

- competitions
- competition_teams
- competition_standings

---

## Новини

- news

---

## Галерея

- gallery_albums
- gallery_photos

---

## Push Notifications

- push_subscriptions

---

## Довідники

- player_statistics
- seasons
- settings

> Примітка:
> Точний опис кожної таблиці наведено в документі **05 Tables**.

---

# 5. Загальна схема даних

```text
Players
      │
      ├──────────────┐
      ▼              ▼
Attendance      Match Statistics
      │              │
      ▼              ▼
 Trainings     Competitions
                     │
                     ▼
              Standings

News ─────────────► Public Website

Gallery ──────────► Public Website

Push Subscriptions
        │
        ▼
 Push Notifications
```

---

# 6. Storage

Для зберігання медіафайлів використовується Supabase Storage.

На момент створення документації існують наступні Buckets:

| Bucket         | Призначення        |
| -------------- | ------------------ |
| player-photos  | Фото гравців       |
| news-images    | Зображення новин   |
| gallery-photos | Фотографії галереї |

Усі Buckets є публічними.

---

# 7. Захист даних

Для забезпечення безпеки використовується:

- Row Level Security (RLS)
- Storage Policies
- Database Policies
- Public Storage Buckets
- Foreign Keys
- Referential Integrity

Доступ до таблиць контролюється політиками Supabase.

---

# 8. SQL Functions

База даних використовує PostgreSQL Functions для автоматизації бізнес-логіки.

Серед основних функцій:

- активація тренувань;
- автоматичний перерахунок турнірної таблиці;
- оновлення статистики;
- автоматичне оновлення Attendance;
- синхронізація даних.

Повний опис наведено в документі:

**06 Functions & Triggers**

---

# 9. Database Triggers

У системі використовуються PostgreSQL Triggers.

Вони відповідають за:

- автоматичне оновлення полів;
- синхронізацію даних;
- виклик SQL Functions;
- підтримку цілісності даних.

---

# 10. Принципи проектування

При проектуванні бази даних використовувались наступні принципи:

- нормалізація даних;
- мінімальне дублювання інформації;
- використання Foreign Keys;
- централізоване зберігання;
- автоматизація бізнес-логіки;
- масштабованість;
- підтримка Production середовища.

---

# 11. Поточний стан

База даних вже використовується у Production.

На момент створення документації вона забезпечує роботу:

- Public Website;
- Admin Panel;
- PWA;
- Push Notifications;
- Attendance;
- Players;
- Matches;
- Competitions;
- News;
- Gallery.

Усі модулі працюють із єдиною централізованою базою даних.

---

"Database Health"
| Показатель | Статус |
| ---------------- | ------ |
| PostgreSQL | ✅ |
| Foreign Keys | ✅ |
| Triggers | ✅ |
| Functions | ✅ |
| RLS | ✅ |
| Storage | ✅ |
| Production Ready | ✅ |

## Історія змін

| Версія | Дата        | Зміни             |
| ------ | ----------- | ----------------- |
| 1.0    | Липень 2026 | Створено документ |
