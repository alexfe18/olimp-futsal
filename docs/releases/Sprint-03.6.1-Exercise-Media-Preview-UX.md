# Sprint 03.6.1 — Exercise Media Preview UX

## Мета

Замінити абстрактний текстовий стан завантажених медіа на зрозуміле візуальне представлення фактичного файлу.

## Реалізовано

- preview поточної та нової обкладинки;
- preview поточної та нової схеми;
- стани `Поточний файл` / `Новий файл`;
- ім'я файлу та стан для відео;
- контекстна дія `Замінити`;
- окрема destructive-дія `Видалити`;
- збереження існуючої логіки відкладеного видалення.

## Змінені файли

- `app/admin/coach/exercises/components/form/ExerciseForm.tsx`
- `docs/16-architecture-decisions.md`
- `docs/17-sprint-3-create-edit.md`
- `docs/18-current-state.md`
- `docs/CHANGELOG.md`

## Перевірки

- `npx tsc --noEmit`
- `npx eslint app/admin/coach/exercises/components/form/ExerciseForm.tsx`

Обидві перевірки пройдені успішно.
