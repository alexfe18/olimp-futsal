# Sprint 03.6.0 — Exercise Media Management

Дата: 2026-08-01

## Мета

Дозволити тренеру не лише замінювати, а й явно видаляти медіа вправи без ризику втрати чинного файлу при помилці збереження.

## Змінені файли

- `app/admin/coach/exercises/components/form/hooks/useExerciseForm.ts`
- `app/admin/coach/exercises/components/form/ExerciseForm.tsx`
- `app/admin/coach/exercises/components/form/sections/ExerciseFormSidebar.tsx`
- `docs/16-architecture-decisions.md`
- `docs/17-sprint-3-create-edit.md`
- `docs/18-current-state.md`
- `docs/19-tech-debt.md`
- `docs/CHANGELOG.md`

## Функціональність

- видалення існуючої обкладинки;
- видалення існуючої схеми;
- видалення завантаженого відеофайлу;
- скасування запланованого видалення;
- заміна кожного типу медіа;
- очищення зовнішнього відеопосилання;
- миттєве оновлення preview і sidebar;
- фізичне видалення старого Storage-файлу лише після успішного update.

## Перевірки

- `npx tsc --noEmit` — PASS
- scoped ESLint для змінених TS/TSX-файлів — PASS

## Не входить у реліз

- попередження про несохранені зміни;
- progress bar для великих відеофайлів;
- автоматичний cleanup orphan-файлів Storage.
