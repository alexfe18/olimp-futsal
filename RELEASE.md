# Release 0.5.2 — Training Publish Flow

Статус: Sprint 05.2.1 package ready for local SQL migration and QA.

В релиз входят:

- Training Builder и Templates из 0.5.1;
- Draft / Planned / Published / Completed / Cancelled lifecycle;
- создание одной linked training уже на этапе planning;
- публикация без дублирования training UUID;
- Plan ↔ Training navigation и read-only plan summary;
- синхронизация date/time/location/team в обе стороны;
- существующие Push-уведомления для publish/update/cancel/restore;
- Attendance linkage по одному `training_id`;
- ручные тренировки без плана;
- техническая основа для Sprint 05.3 Team Plan Visibility.

Обязательные миграции:

```text
sql/2026-08-03-training-publish-flow.sql
sql/2026-08-04-plan-training-integration-ux-completion.sql
```
