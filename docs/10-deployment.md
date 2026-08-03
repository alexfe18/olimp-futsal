# Deployment Guide

> Production Deployment Documentation
> Version: 1.0
> Last updated: July 2026

---

# 1. Загальна інформація

Проект **«Олімп Футзал»** використовує сучасну cloud-архітектуру та автоматичний деплой.

Основні компоненти інфраструктури:

- GitHub
- Vercel
- Supabase
- Supabase Storage
- HTTPS
- PWA
- Web Push

---

# 2. Production Architecture

```text
Developer

      │

Git Commit

      │

GitHub Repository

      │

Automatic Deployment

      │

Vercel

      │

Production Website

      │

Supabase

      │

Storage

      │

Players
```

---

# 3. Основні сервіси

## GitHub

Використовується для:

- зберігання коду;
- контролю версій;
- історії змін.

---

## Vercel

Використовується для:

- автоматичного деплою;
- хостингу Next.js;
- SSL;
- CDN.

---

## Supabase

Використовується для:

- PostgreSQL Database;
- Authentication;
- Storage;
- API;
- SQL Functions.

---

# 4. Environment Variables

Для роботи Production використовуються змінні середовища.

Приклади:

```env
NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

NEXT_PUBLIC_VAPID_PUBLIC_KEY

VAPID_PRIVATE_KEY

NEXT_PUBLIC_SITE_URL
```

> **Важливо:** секретні значення не зберігаються в репозиторії та не включаються до документації.

---

# 5. Процес розробки

Стандартний цикл:

```text
Feature Development

↓

Local Testing

↓

npm run build

↓

Git Commit

↓

Git Push

↓

Automatic Deployment

↓

Production

↓

Smoke Testing
```

---

# 6. Перед деплоєм

Обов'язково перевірити:

- відсутність помилок TypeScript;
- успішне виконання `npm run build`;
- коректність нових маршрутів;
- працездатність API;
- актуальність змінних середовища.

---

# 7. Після деплою

Після кожного Production Release виконується Smoke Testing.

Основні перевірки:

### Public Website

- Home
- Training
- News
- Gallery

---

### Admin Panel

- Players
- Trainings
- Attendance
- Matches
- Competitions
- Statistics
- News
- Gallery

---

### Push Notifications

- надсилання повідомлення;
- отримання повідомлення;
- відкриття застосунку.

---

### PWA

- Android
- iPhone
- Desktop

---

# 8. Production Releases

На момент створення документації виконано:

## Release 1

- Public Website
- PWA
- Push Notifications
- Voting

---

## Release 2

- Повноцінна Admin Panel
- Statistics
- Competitions
- Matches
- Attendance
- News
- Gallery

---

## Release 2.0.1

- Public News
- Public Gallery
- Header Navigation
- Footer Navigation
- Mobile Menu

---

# 9. Rollback

У випадку критичних проблем:

1. визначити причину;
2. повернути попередній Git Commit;
3. виконати повторний деплой;
4. провести Smoke Testing.

---

# 10. Backup Strategy

Основні дані зберігаються у:

- PostgreSQL Database;
- Supabase Storage.

Рекомендується:

- регулярний експорт бази даних;
- резервне копіювання Storage;
- резервне копіювання Environment Variables.

---

# 11. Monitoring

Після релізу контролюються:

- доступність Production;
- помилки Vercel;
- Push Notifications;
- журнал Supabase;
- робота API;
- доступність Storage.

---

# 12. Production Checklist

Перед завершенням релізу необхідно підтвердити:

- ✅ Build успішний
- ✅ Deployment успішний
- ✅ Public Website працює
- ✅ Admin Panel працює
- ✅ PWA працює
- ✅ Push Notifications працюють
- ✅ Voting працює
- ✅ News працюють
- ✅ Gallery працює

---

# 13. Поточний стан

На момент створення документації:

- Production працює стабільно;
- автоматичний деплой налаштований;
- Push Notifications використовуються реальною командою;
- PWA встановлено користувачами;
- система використовується у щоденній роботі клубу.

---

## Історія змін

| Версія | Дата        | Зміни             |
| ------ | ----------- | ----------------- |
| 1.0    | Липень 2026 | Створено документ |
