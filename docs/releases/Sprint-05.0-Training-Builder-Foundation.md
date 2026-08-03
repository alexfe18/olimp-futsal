# Sprint 05.0 — Training Builder Foundation

## Delivered

- обновлён список планов тренировок;
- добавлены поиск, фильтры, статистика, loading/error/empty states;
- создана общая Create/Edit форма Training Builder;
- добавлен выбор активных упражнений из Библиотеки упражнений;
- добавлены поиск и фильтрация библиотеки по категории;
- добавлено явное подтверждение повторного добавления упражнения;
- добавлены изменение порядка, длительности и заметок;
- добавлен автоматический расчёт общей длительности;
- добавлено транзакционное сохранение draft через Supabase RPC;
- добавлена повторная загрузка сохранённого порядка;
- добавлена защита незбережённых изменений;
- обновлён Coach Workspace Dashboard;
- добавлены SQL migration, документация и QA checklist.

## Database

Выполнить:

`sql/2026-08-02-training-builder-foundation.sql`

Миграция добавляет metadata-поля в `training_plans`, ссылку `exercise_id` в `training_plan_blocks`, индексы и RPC `save_training_plan_draft`.

## Compatibility

Старые `training_id` и собственные блоки не удаляются. Для нового сохранения план должен содержать минимум одно упражнение из Библиотеки упражнений.

## Verification

- TypeScript — PASS;
- scoped ESLint — PASS;
- SQL structural checks — PASS;
- production build — не подтверждён в контейнере из-за недоступного Linux SWC package в package mirror.

## Next

`Sprint 05.1 — Training Builder UX & Templates` либо следующий функциональный этап после пользовательской QA-проверки Foundation.
