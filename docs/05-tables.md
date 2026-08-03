# Database Tables Reference

> Database Tables Documentation
> Version: 1.0
> Last updated: July 2026

---

# 1. Загальна інформація

База даних системи **«Олімп Футзал»** включає **20 основних таблиць**, які забезпечують роботу всіх функціональних модулів системи.

Кожна таблиця має чітке призначення та використовується одним або декількома модулями.

---

# 2. Таблиці системи

| Таблиця                     | Модуль             |
| --------------------------- | ------------------ |
| players                     | Players            |
| trainings                   | Trainings          |
| training_attendance         | Attendance         |
| competitions                | Competitions       |
| competition_teams           | Competitions       |
| competition_standings       | Competitions       |
| competition_playoff_matches | Playoffs           |
| opponents                   | Opponents          |
| matches                     | Matches            |
| match_player_stats          | Match Statistics   |
| player_competition_stats    | Player Statistics  |
| news                        | News               |
| gallery_albums              | Gallery            |
| gallery_photos              | Gallery            |
| push_subscriptions          | Push Notifications |
| exercises                   | Exercise Library   |
| exercise_goals              | Exercise Library   |
| exercise_tags               | Exercise Library   |
| training_plans              | Training Builder   |
| training_plan_blocks        | Training Builder   |

---

# 3. Players

## Призначення

Зберігає інформацію про всіх гравців клубу.

### Основні поля

| Поле         | Тип         | Nullable | Default           |
| ------------ | ----------- | -------- | ----------------- |
| id           | uuid        | ❌       | gen_random_uuid() |
| full_name    | text        | ❌       | —                 |
| display_name | text        | ✅       | —                 |
| shirt_number | integer     | ✅       | —                 |
| position     | text        | ✅       | —                 |
| photo_url    | text        | ✅       | —                 |
| is_active    | boolean     | ❌       | true              |
| created_at   | timestamptz | ❌       | now()             |
| updated_at   | timestamptz | ❌       | now()             |

### Використовується

- Players
- Attendance
- Match Statistics
- Push Notifications

---

# 4. Trainings

## Призначення

Зберігає тренування команди.

### Основні поля

| Поле                | Тип         |
| ------------------- | ----------- |
| id                  | uuid        |
| title               | text        |
| starts_at           | timestamptz |
| location            | text        |
| status              | text        |
| is_active           | boolean     |
| cancellation_reason | text        |
| created_at          | timestamptz |
| updated_at          | timestamptz |

### Використовується

- Training Calendar
- Attendance
- Push Notifications

---

# 5. Training Attendance

## Призначення

Зберігає відповіді гравців та фактичну відвідуваність.

### Основні поля

- training_id
- player_id
- player_name
- status
- actual_status
- coach_note
- marked_at

### Використовується

- Attendance
- Statistics

---

# 6. Competitions

## Призначення

Інформація про турніри та чемпіонати.

Основні поля:

- name
- short_name
- competition_type
- season
- starts_at
- ends_at
- final_position
- is_active

---

# 7. Competition Teams

## Призначення

Команди-учасники конкретного турніру.

Основні поля:

- competition_id
- opponent_id
- team_name
- short_name
- logo_url
- is_olimp

---

# 8. Competition Standings

## Призначення

Турнірна таблиця.

Основні поля:

- played
- wins
- draws
- losses
- goals_for
- goals_against
- points
- position
- form

Таблиця автоматично оновлюється SQL Functions.

---

# 9. Competition Playoff Matches

## Призначення

Матчі плей-оф.

Основні поля:

- stage
- home_team
- away_team
- winner_team
- match_date
- location

---

# 10. Opponents

## Призначення

Довідник команд-суперників.

Основні поля:

- name
- short_name
- city
- logo_url
- is_active

---

# 11. Matches

## Призначення

Усі матчі клубу.

Основні поля:

- competition_id
- opponent_id
- title
- starts_at
- location
- venue_type
- status
- round_name
- home_score
- away_score
- report
- video_url
- source_url
- is_archived

---

# 12. Match Player Statistics

## Призначення

Статистика кожного гравця у конкретному матчі.

Основні поля:

- player_id
- match_id
- goals
- assists
- yellow_cards
- red_cards
- own_goals
- clean_sheet
- goals_conceded
- is_mvp

---

# 13. Player Competition Statistics

## Призначення

Загальна статистика гравця в рамках одного турніру.

Основні поля:

- matches_played
- goals
- assists
- yellow_cards
- red_cards
- own_goals
- mvp_awards
- clean_sheets

---

# 14. News

## Призначення

Новини клубу.

Основні поля:

- title
- slug
- excerpt
- content
- cover_url
- status
- is_featured
- published_at

---

# 15. Gallery Albums

## Призначення

Фотоальбоми.

Основні поля:

- title
- slug
- description
- event_date
- season
- cover_url
- status
- is_featured
- competition_id
- match_id
- news_id

---

# 16. Gallery Photos

## Призначення

Фотографії всередині альбомів.

Основні поля:

- album_id
- image_url
- storage_path
- caption
- alt_text
- sort_order
- width
- height
- file_size
- is_cover

---

# 17. Push Subscriptions

## Призначення

Web Push підписки користувачів.

Основні поля:

- endpoint
- p256dh
- auth
- player_id
- player_name
- user_agent

Використовується для надсилання Push Notifications.

---

# 18. Загальна структура

```text
Players
      │
      ├─────────────► Attendance
      │
      └─────────────► Match Statistics

Competitions
      │
      ├─────────────► Teams
      ├─────────────► Matches
      ├─────────────► Standings
      └─────────────► Playoff Matches

Gallery
      │
      └─────────────► Photos

News

Push Subscriptions
```

---

# 19. Висновок

Структура бази даних побудована за модульним принципом.

Основні переваги:

- централізоване зберігання даних;
- нормалізована структура;
- використання UUID;
- підтримка масштабування;
- підтримка автоматичних SQL Functions;
- підтримка Database Triggers;
- підтримка Row Level Security.

---

## Історія змін

| Версія | Дата        | Зміни             |
| ------ | ----------- | ----------------- |
| 1.0    | Липень 2026 | Створено документ |


---

# 18. Exercises

## Призначення

Зберігає бібліотеку футзальних вправ, методичний опис, класифікацію, навантаження та посилання на медіа.

Ключові поля для Training Builder:

- `id`;
- `code`;
- `title`;
- `description`;
- `category`;
- `duration_minutes`;
- `difficulty`;
- `status`;
- `player_format`;
- `min_players` / `max_players`;
- `age_groups`.

Training Builder використовує лише вправи зі status `active`.

# 19. Exercise Goals and Tags

## Призначення

`exercise_goals` та `exercise_tags` зберігають нормалізовані цілі й теги вправ. У Sprint 05.0 вони не копіюються в план, але залишаються доступними для майбутніх рекомендацій і шаблонів.

# 20. Training Plans

## Призначення

Зберігає метадані чернетки тренувальної сесії.

| Поле | Тип | Призначення |
|---|---|---|
| id | uuid | ID плану |
| title | text | Назва сесії |
| training_id | uuid nullable | Існуючий зв’язок із calendar training |
| session_date | date nullable | Дата в Training Builder |
| team_name | text nullable | Команда або група |
| age_group | text nullable | Вікова група |
| objective | text nullable | Головна мета |
| planned_duration | integer | Сума тривалості блоків |
| intensity | text | low / medium / high / recovery |
| status | text | draft / planned / in_progress / completed / cancelled |
| notes | text nullable | Нотатки тренера |
| created_at / updated_at | timestamptz | Системні timestamps |

# 21. Training Plan Blocks

## Призначення

Зберігає впорядковані блоки плану й optional link на Exercise Library.

| Поле | Тип | Призначення |
|---|---|---|
| training_plan_id | uuid | Батьківський план |
| exercise_id | uuid nullable | Посилання на `exercises.id` |
| title | text | Snapshot назви |
| description | text nullable | Snapshot опису |
| duration_minutes | integer | Тривалість у плані |
| block_type | text | Тип блоку |
| sort_order | integer | Порядок 0...N-1 |
| notes | text nullable | Нотатки до конкретної вправи |

FK `exercise_id` використовує `ON DELETE SET NULL`, тому видалення вправи не видаляє історичний блок плану.
