# Technical Debt

Последнее обновление: 2026-08-01

## Exercise Library

### High

- Критических пунктов для текущего Exercise Library Sprint нет.

### Medium

- Добавить автоматические unit-тесты JSON/CSV parser и import validator.
- Рассмотреть server-side/RPC transaction для полностью атомарного batch import.
- Добавить media URL import после утверждения политики безопасности внешних источников.
- Добавить unit-тесты ZIP central-directory parser и fallback для браузеров без `DecompressionStream`.
- Рассмотреть поддержку ZIP64 при переходе к очень большим media packs.
- Добавить server-side import job и журнал истории медиа-импортов.

- Добавить периодическую проверку и очистку orphan-файлов в `exercise-media`, если Storage cleanup завершился ошибкой.

- Отключать сохранение, если данные не изменились (dirty-state уже реализован).
- Добавить progress indicator для загрузки больших видеофайлов.
- Перенести повторяющиеся status/goal labels в единый shared dictionary.
- Добавить автоматические тесты mapper и validation.

### Low

- Добавить Duplicate Exercise mode.
- Добавить историю версий упражнения.
- Добавить autosave черновика.

## Общий проект

- Синхронизировать старый roadmap с актуальным приоритетом Coach Workspace.
- Постепенно устранить существующие глобальные ESLint warnings вне Exercise Library.
- Исключить generated/service-worker артефакты из проверок там, где это необходимо.
