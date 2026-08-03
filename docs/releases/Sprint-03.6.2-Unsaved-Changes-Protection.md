# Sprint 03.6.2 — Unsaved Changes Protection

## Мета

Захистити Create/Edit вправи від випадкової втрати введених даних без блокування нормального збереження та навігації.

## Реалізовано

- snapshot-based dirty-state;
- захист кнопки `Скасувати`;
- перехоплення внутрішніх посилань;
- history guard для browser Back;
- `beforeunload` для refresh/close tab;
- урахування цілей, вікових груп, тегів і всіх media-станів;
- автоматичне зняття dirty-state при повному поверненні до початкових значень;
- контрольований redirect після успішного збереження.

## Змінені файли

- `app/admin/coach/exercises/components/form/ExerciseForm.tsx`
- `app/admin/coach/exercises/components/form/ExerciseFormHero.tsx`
- `app/admin/coach/exercises/components/form/ExerciseFormActions.tsx`
- `app/admin/coach/exercises/components/form/hooks/useExerciseForm.ts`
- `app/admin/coach/exercises/components/form/hooks/useUnsavedChangesProtection.ts`
- `docs/16-architecture-decisions.md`
- `docs/17-sprint-3-create-edit.md`
- `docs/18-current-state.md`
- `docs/19-tech-debt.md`
- `docs/CHANGELOG.md`

## Перевірки

- `npx tsc --noEmit`
- scoped ESLint для всіх змінених Exercise Form файлів
