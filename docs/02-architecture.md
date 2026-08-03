# Олімп Футзал — System Architecture

> Technical Architecture  
> Version: 1.0  
> Last updated: July 2026

---

# 1. Загальна архітектура

Проект побудований за сучасною Serverless архітектурою.

Основні компоненти:

- Next.js (Frontend + API Routes)
- Supabase (Backend)
- PostgreSQL Database
- Supabase Storage
- Authentication
- Push Notifications
- Progressive Web App (PWA)
- Vercel Hosting

---

# 2. Загальна схема системи

```text
                         ┌──────────────────────────┐
                         │        Користувач        │
                         └─────────────┬────────────┘
                                       │
                                       ▼
                         Progressive Web App (PWA)
                                       │
                                       ▼
                              Next.js Application
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          ▼                            ▼                            ▼
   Public Website                 Admin Panel                  API Routes
          │                            │                            │
          └────────────────────────────┼────────────────────────────┘
                                       ▼
                                  Supabase
          ┌────────────────────────────┼────────────────────────────┐
          ▼                            ▼                            ▼
      PostgreSQL                  Authentication              Storage
          │                            │                            │
          └────────────────────────────┼────────────────────────────┘
                                       ▼
                             Push Notifications
                                       │
                                       ▼
                               Android / iPhone
```

---

# 3. Технологічний стек

## Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

---

## Backend

- Supabase
- PostgreSQL
- Row Level Security (RLS)
- SQL Functions

---

## Hosting

- Vercel

---

## Storage

- Supabase Storage

Використовується для:

- фотографій новин;
- фотографій галереї;
- зображень гравців;
- інших медіафайлів.

---

## Notifications

- Web Push API
- Service Worker
- VAPID Keys

---

# 4. Структура проекту

```text
app/

├── admin/
│   ├── attendance/
│   ├── competitions/
│   ├── gallery/
│   ├── matches/
│   ├── news/
│   ├── players/
│   ├── statistics/
│   └── trainings/
│
├── api/
│
├── gallery/
│   └── [slug]/
│
├── news/
│   └── [slug]/
│
├── training/
│
└── page.tsx


components/

hooks/

lib/

public/

docs/
```

---

# 5. Архітектура модулів

Система складається з незалежних функціональних модулів.

```text
Players
        │
        ▼
Trainings
        │
        ▼
Attendance
        │
        ▼
Statistics
        │
        ▼
Matches
        │
        ▼
Competitions
        │
        ▼
News
        │
        ▼
Gallery
        │
        ▼
Push Notifications
```

Кожен модуль може розвиватись незалежно.

---

# 6. Архітектура даних

```text
Admin Panel
      │
      ▼
 Supabase Database
      │
      ▼
 Public Website
```

Усі зміни, виконані в адміністративній панелі,
відразу відображаються на публічному сайті.

---

# 7. Потік створення тренування

```text
Адміністратор

        │

Створює тренування

        │

Supabase Database

        │

Push Notification

        │

PWA застосунок

        │

Гравець отримує повідомлення

        │

Відповідає

        │

Attendance

        │

Статистика
```

---

# 8. Потік публікації новини

```text
Адміністратор

        │

Створює новину

        │

Завантажує фото

        │

Supabase Storage

        │

Новина публікується

        │

Сторінка /news

        │

Сторінка /news/[slug]
```

---

# 9. Потік створення фотоальбому

```text
Адміністратор

        │

Створює альбом

        │

Завантажує фотографії

        │

Supabase Storage

        │

Gallery

        │

Gallery/[slug]
```

---

# 10. Production інфраструктура

```text
Developer

      │

GitHub Repository

      │

git push

      │

Vercel Deployment

      │

Production Website

      │

Supabase

      │

Користувачі
```

---

# 11. Принципи архітектури

При розробці проекту використовуються наступні принципи:

- модульність;
- масштабованість;
- мінімальна зв'язність між модулями;
- централізоване зберігання даних;
- автоматичний деплой;
- єдина база даних;
- єдина адміністративна панель;
- адаптивний дизайн;
- mobile-first;
- Progressive Web App.

---

# 12. Поточний стан архітектури

На момент написання документації система включає:

✅ Public Website

✅ Admin Panel

✅ PWA

✅ Push Notifications

✅ News

✅ Gallery

✅ Attendance

✅ Players

✅ Matches

✅ Competitions

✅ Statistics

Усі модулі вже працюють у Production.

---

## Історія змін

| Версія | Дата        | Зміни             |
| ------ | ----------- | ----------------- |
| 1.0    | Липень 2026 | Створено документ |
