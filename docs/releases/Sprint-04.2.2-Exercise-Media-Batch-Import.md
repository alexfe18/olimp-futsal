# Sprint 04.2.2 — Exercise Media Batch Import

## Delivered

- новий маршрут `/admin/coach/exercises/media-import`;
- пункт `Імпорт медіа` у Coach Workspace Navigation;
- завантаження одного ZIP або кількох окремих зображень;
- розпакування стандартних ZIP без додаткової npm-залежності;
- прив’язка `CODE-cover` і `CODE-diagram` до `exercises.code`;
- перевірка формату, розміру, dimensions, повторів і відсутніх вправ;
- thumbnail preview;
- фільтри `Усього / Готові / Помилки / Заміни`;
- стратегії `Пропустити` та `Замінити`;
- безпечний upload → database update → cleanup порядок;
- rollback нового файла, якщо update вправи завершився помилкою;
- progress і підсумковий звіт;
- оновлення Coach Dashboard і документації.

## Constraints

- підтримуються лише обкладинка та одна схема на вправу;
- ZIP64, encrypted і multi-volume ZIP не підтримуються;
- автоматична історія імпортів ще не зберігається;
- orphan cleanup після помилки Storage залишається best-effort.

## Verification

- `npx tsc --noEmit` — PASS;
- scoped ESLint — PASS.

## SQL

SQL-міграції не потрібні.
