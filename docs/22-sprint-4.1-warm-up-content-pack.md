# Sprint 04.1 — Warm-up Content Pack v1

Дата: 2026-08-02

## Мета

Підготувати перший професійний контентний набір Exercise Library: 15 вправ категорії `warm_up`, готових до імпорту через JSON або CSV.

## Результат

- 15 вправ із кодами `WU-001`–`WU-015`.
- Український контент для всіх підтримуваних полів.
- JSON і CSV мають однаковий зміст.
- Усі вправи мають `status: active`, `library_tier: core` і джерело `Futsal Exercise Library — Warm-up Content Pack v1.0`.
- Пакет охоплює поступову активацію, технічну роботу з м’ячем, рондо, переходи, пресинг, завершення, воротарську підготовку та малі ігри.

## Структура файлів

- `content/exercises/Futsal-Exercise-Library-Warmup-v1.json`
- `content/exercises/Futsal-Exercise-Library-Warmup-v1.csv`
- `content/exercises/Warm-up-Content-Pack-v1-Catalog.md`
- `qa/Warm-up-Content-Pack-v1-QA-Checklist.md`

## Валідація

Пакет перевіряється проти актуальних довідників Exercise Import:

- категорії, типи, формати, складність;
- інтенсивність і розмір майданчика;
- вікові групи та цілі;
- статус і рівень бібліотеки;
- унікальність кодів;
- паритет JSON/CSV.

## Наступний крок

Імпортувати JSON у локальне середовище, виконати QA за чеклістом та перейти до інтеграції Exercise Library з Training Builder.
