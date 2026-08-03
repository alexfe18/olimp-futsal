# Technical Content Pack v1 — Validation Report

Дата перевірки: 2026-08-02

## Exercise Import parser / validator

| Формат | Рядків | Валідних | Помилок |
|---|---:|---:|---:|
| JSON | 15 | 15 | 0 |
| CSV | 15 | 15 | 0 |

- Послідовність кодів JSON: `TECH-001`–`TECH-015`.
- Послідовність кодів CSV: `TECH-001`–`TECH-015`.
- Parser parity: PASS.
- Повний паритет усіх 27 імпортних полів JSON ↔ CSV: PASS.
- Унікальність кодів: PASS.
- Категорія всіх записів `technical`: PASS.
- Статус усіх записів `active`: PASS.
- Рівень бібліотеки всіх записів `core`: PASS.
- Службовий суфікс `— ОНОВЛЕНО` у назвах відсутній: PASS.

## Розподіл

- Складність: {'easy': 3, 'medium': 6, 'hard': 5, 'advanced': 1}
- Тип вправи: {'technical': 11, 'complex': 3, 'game': 1}
- Формат: {'individual': 3, 'without_opposition': 7, '1v1': 2, '2v1': 1, '4v2': 1, '3v3': 1}
- Інтенсивність: {'low': 1, 'medium': 7, 'high': 6, 'variable': 1}

## Використаний валідатор

Перевірка виконана актуальними файлами проєкту:

- `exercise-import-parser.ts`
- `exercise-import-validator.ts`
- `exercise-options.ts`
- `import/types.ts`

Результат: пакет готовий до Import QA через `/admin/coach/exercises/import`.
