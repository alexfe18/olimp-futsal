## Sprint 05.0.5 — Quick View Link Recovery & Hero Age Fix

- Library exercise actions are now rendered from the block identity, even while the Exercise Library relation is being recovered.
- Missing exercise links are recovered by direct ID, exercise code or exact title match.
- Recovered links are written back on the next save so existing plans keep their Exercise Library connection.
- Quick View and full-page actions remain visible in a disabled loading state until the linked exercise ID is available.
- Hero age metric no longer truncates `U13–U14`, `U15–U17` or `Дорослі`.
- SQL is not required.

## Sprint 05.0.4 — Quick View Action Visibility Fix

- Виправлено приховування кнопки Quick View на картках вправ.
- Дії перегляду перенесено в окремий адаптивний рядок.
- Додано пряме посилання на повну сторінку вправи.

## Sprint 05.0.3 — Exercise Quick View & Manual Block UX

- Нові власні блоки створюються з порожньою назвою та placeholder.
- Додано Quick View для вправ без виходу з Training Builder.
- Додано повний методичний контент, метрики, цілі, теги та медіа.
- Додано відкриття повної сторінки вправи у новій вкладці.
- Додано loading, error, retry, Escape і backdrop close states.
- SQL-міграція не потрібна.


## Sprint 05.0 — Training Builder Foundation

- Підключено Бібліотеку вправ до планів тренувань.
- Додано спільний Create/Edit Training Builder.
- Додано metadata сесії: дата, команда, вікова група, мета й нотатки.
- Додано пошук і фільтр активних вправ.
- Додано explicit confirmation для повторного додавання вправи.
- Додано reorder, duration, per-exercise notes і автоматичний total time.
- Додано атомарне збереження через `save_training_plan_draft`.
- Додано повторне відкриття draft зі збереженим порядком.
- Додано Unsaved Changes protection, loading/error/empty states.
- Додано SQL migration, QA checklist і документацію.


## Sprint 04.2.2 — Exercise Media Batch Import

- Додано маршрут `/admin/coach/exercises/media-import` і пункт `Імпорт медіа` у робочому просторі тренера.
- Додано пакетне завантаження обкладинок і схем із ZIP або окремих зображень.
- Додано filename contract `CODE-cover` / `CODE-diagram`, пошук вправи за `exercises.code` і thumbnail preview.
- Додано перевірку формату, розміру, dimensions, повторів у пакеті та відсутніх кодів.
- Додано фільтри `Усього / Готові / Помилки / Заміни`.
- Додано стратегії пропуску або безпечної заміни існуючих медіа.
- Новий файл зберігається до зміни database path; старий видаляється лише після успішного update.
- Додано progress, rollback нового upload і підсумковий звіт.


## Sprint 04.0.4 — Coach Workspace Navigation

- Адмін-навігацію згруповано за робочими зонами: `Робочий простір тренера`, `Команда`, `Комунікації` та `Система`.
- Додано окремий маршрут `/admin/coach` з оглядом модулів тренера й швидкими діями.
- До тренерського простору додано прямі переходи до тренувань, планів, бібліотеки та імпорту вправ.
- Desktop і mobile меню використовують єдину конфігурацію навігації.
- Активний пункт визначається за найдовшим відповідним маршрутом, тому Import, Details, Edit і Library не підсвічуються одночасно.
- Кнопка імпорту в Hero бібліотеки збережена як швидка точка входу.


## Sprint 03.6.1 — Exercise Media Preview UX

- Додано візуальні мініатюри поточної та нової обкладинки безпосередньо у формі.
- Додано візуальні мініатюри поточної та нової схеми вправи.
- Додано зрозумілі стани `Поточний файл` і `Новий файл`.
- Для нового файлу показується повідомлення, що він буде збережений після підтвердження.
- Для відеофайлу показуються іконка, ім'я файлу та стан замість абстрактного upload-блоку.
- Дії `Замінити` та `Видалити` залишаються доступними поруч із фактичним медіа.


## Sprint 03.6.0 — Exercise Media Management

- Додано явне видалення існуючої обкладинки, схеми та відеофайлу.
- Додано скасування запланованого видалення до збереження.
- Додано зрозумілі стани `Замінити файл`, `Видалити` та `Буде видалено після збереження`.
- Додано окрему дію очищення зовнішнього відеопосилання.
- Старі файли видаляються зі Supabase Storage лише після успішного оновлення вправи.
- Медіа, яких користувач не торкався, залишаються без змін.


## Sprint 03.5.5 — Exercise UI Localization Polish

- Прибрано змішування української та англійської мов у Exercise Library, Create/Edit і Details.
- Локалізовано `pressing`, `full_team`, `custom`, рівні бібліотеки та інші enum-значення на екрані вправи.
- Локалізовано `Coach Workspace`, `Edit exercise`, `New exercise`, `Exercise Preview` і `Training Builder`.
- Зафіксовано правило: англомовні ключі зберігаються в БД, а UI використовує локалізаційні словники.

# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog.

---

# Release 2.0.1

## Public Navigation Integration

Release Date:
July 2026

### Added

- Public Gallery page
- Gallery listing page
- Album detail page
- Public News section
- Public article pages
- Navigation between public pages
- Updated desktop navigation
- Updated mobile navigation
- Updated footer navigation
- Production deployment

### Improved

- Public website structure
- Routing
- User experience
- Internal navigation
- SEO-friendly page structure

### Fixed

- Broken anchor navigation
- Public page accessibility
- Gallery routing

---

# Release 2.0.0

## Complete Club Management System

Release Date:
July 2026

### Added

#### Administration

- Admin Dashboard
- Player Management
- Training Management
- Attendance System
- Match Management
- Competition Management
- Statistics
- News Management
- Gallery Management

#### Public Website

- Homepage
- Training page
- Responsive layout
- Animations
- Image optimization

#### PWA

- Installable application
- Offline support
- Manifest
- Icons

#### Push Notifications

- Browser subscription
- Training notifications
- Attendance reminders

#### Database

- PostgreSQL schema
- Supabase Storage
- RLS policies
- SQL functions
- Triggers

### Improved

- Mobile interface
- Responsive design
- Performance
- Component architecture

---

# Release 1.0.0

## Initial Website

Release Date:
2026

### Added

- Club homepage
- About section
- History
- Achievements
- Contacts
- Training section
- Initial responsive layout

---

# Upcoming

## Release 3.0

Planned

- User Authentication
- Player Accounts
- Personal Dashboard
- Calendar
- Financial Module
- Telegram Integration
- AI Assistant
- Match Analytics
- Advanced Statistics
- Role-based permissions

---

# Project Milestones

## ✅ Milestone 1

Public Club Website

Completed

## ✅ Milestone 2

Complete Club Management System

Completed

## 🔄 Milestone 3

Player Accounts & Authentication

In Progress

## ⏳ Milestone 4

AI Club Assistant

Planned

---

# Sprint 3 — Exercise Create/Edit Workspace

Date: 2026-07-31

### Added

- Reusable Exercise Workspace shell, hero, layout and sidebar primitives.
- Modular Exercise Form configuration, types, hook, actions, hero and preview sidebar.
- Shared Create/Edit form foundation through `mode` and `initialData`.
- Sprint 3 implementation documentation.

### Changed

- Exercise Create page now uses the shared workspace architecture.
- Legacy `/admin/coach/exercises/new` route redirects to `/create`.

### Next

- Implement Exercise Edit data loading and update flow.
- Add existing-media replacement/removal and unsaved-change protection.


### Sprint 3 — Create Workspace polish
- Fixed visual overlap in the exercise preview card on `/admin/coach/exercises/create`.
- Localized primary goal values on Exercise Library cards (for example, `pressing` → `Пресинг`).


### Sprint 3.5.0 — Exercise Edit Foundation
- Added a typed Exercise Edit data loader with goals and tags.
- Added a pure mapper from Supabase records to shared form initial data.
- Connected `/admin/coach/exercises/[id]/edit` to the shared Exercise Form.
- Added loading, not-found and error states for the Edit route.
- Existing cover and diagram are displayed in Edit preview.
- Edit saving remains scheduled for Sprint 3.5.1.

### Sprint 3.5.1 — Full Exercise Edit Save Flow

- Enabled saving in Exercise Edit mode.
- Added updates for all fields currently supported by the shared form.
- Added full synchronization of `exercise_goals` and `exercise_tags`.
- Added `primary_goal` synchronization from the first selected goal.
- Added safe cover, diagram and video replacement.
- Existing media paths are preserved when no replacement file is selected.
- Replaced old media files are removed only after a successful save.
- Added best-effort rollback for exercise fields, goals, tags and uploaded media.
- Edit now preserves the current `draft`, `active` or `archived` status.
- Fixed Edit hero and sidebar showing `Чернетка` for an active exercise.
- Edit cancel action now returns to the current exercise Details page.
- Added current-state and technical-debt project documents.


### Sprint 3.5.2 — Exercise Edit submit fix

- Fixed the workspace hero Save/Publish button not submitting the shared form.
- Added explicit `form` binding for actions rendered outside the form element.
- Restored working `Зберегти зміни` in Edit and `Опублікувати` in Create.

### Sprint 3.5.4 — Exercise cover in Library Card

- Added saved exercise cover images to Exercise Library cards.
- Added Supabase Storage path-to-public-URL resolution for card covers.
- Added a dark readability gradient and retained the branded fallback for exercises without covers.


### Sprint 3.6.2 — Unsaved Changes Protection

- Added snapshot-based dirty-state for the shared Exercise Create/Edit form.
- Added confirmation before cancelling or following internal navigation with unsaved changes.
- Added browser Back protection through a history guard.
- Added native refresh/close-tab protection through `beforeunload`.
- Included goals, age groups, tags, file replacement and delayed media removal in dirty-state.
- Moved post-save navigation from the persistence hook to the form navigation guard.
- Successful Create/Edit now redirects without an unnecessary warning.

### Sprint 4.0 — Exercise Import Foundation

- Added `/admin/coach/exercises/import` and an Import action in the Exercise Library hero.
- Added JSON and CSV templates, parser and file-size validation.
- Added row-level preview validation for all supported exercise dictionaries and values.
- Added duplicate detection by exercise code with skip or update strategies.
- Added create/update import flow for exercises, goals and tags.
- Existing cover, diagram and video files are preserved during update imports.
- Added progress tracking, result summary and best-effort rollback.
- Expanded Ukrainian category, type and difficulty dictionaries for imported values.

### Sprint 4.0.1 — Exercise Import QA Fixes

- Moved the `До бібліотеки вправ` navigation from the Import Hero to the standard link position above the Hero.
- Prevented the CSV array separator `|` from wrapping onto a separate line.
- Localized imported `small`, `medium` and `large` field-size values on Exercise Details.

### Sprint 4.0.2 — Exercise Import Summary Filters

- Replaced four separate import counters with one unified statistics panel matching the Exercise Library style.
- Added clickable filters for all rows, ready rows, validation errors and duplicates.
- Made preview groups mutually exclusive so ready + errors + duplicates equals total.
- Added filtered-row counts, duplicate-specific status and an empty state for groups without rows.
- Reset the active summary filter when a different file is selected.


## Sprint 04.0.3 — Import Metadata and Title Cleanup

- Import titles no longer store the QA-only `— ОНОВЛЕНО` suffix.
- Exercise Details now loads and displays import source metadata.
- System history shows the explicit last-update timestamp and data origin.
- Added a one-time SQL cleanup for existing QA-imported titles.

## Sprint 05.2 — Training Publish Flow

- Added Draft → Planned → Published → Completed/Cancelled lifecycle.
- Added session time, location and publication metadata to Training Builder.
- Added atomic publish/unpublish/cancel/restore/complete Supabase RPCs.
- Connected plans to concrete training events and Attendance through `training_id`.
- Added future push event outbox `training_plan_events`.
- Added published-plan update synchronization and safety confirmation.
- Added date filters, linked training links and deletion protection to plan listing.

## Sprint 05.2.1 — Plan ↔ Training Integration & UX Completion

- Planning now creates one inactive linked training on the selected day.
- Publishing activates the same training UUID without duplication.
- Added Plan ↔ Training direct navigation and linked plan summary.
- Added bidirectional date/time/location/team synchronization.
- Added `team_name` to concrete training events and player-facing event details.
- Connected lifecycle actions to the existing Push notification service.
- Added reschedule/location/team/cancel/restore notification messages.
- Added restore-to-active behavior for a training cancelled while published.
- Kept manual trainings without plans fully supported.
- Clarified that the general club calendar is a separate future module.
