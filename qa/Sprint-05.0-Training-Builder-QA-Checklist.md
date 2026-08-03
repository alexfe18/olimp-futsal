# Sprint 05.0 — Training Builder Foundation QA Checklist

## 0. Precondition

- [ ] Выполнена `sql/2026-08-02-training-builder-foundation.sql`.
- [ ] Пользователь авторизован в Admin.
- [ ] В `exercises` есть минимум 3 активных упражнения разных категорий.

## 1. List

- [ ] `/admin/coach/training-plans` открывается без ошибок.
- [ ] Видны статистика, поиск и фильтры Status/Intensity.
- [ ] Empty state отображается при отсутствии планов.
- [ ] Retry работает после искусственной ошибки загрузки.
- [ ] Карточка показывает дату, команду, возраст, интенсивность, количество блоков и длительность.

## 2. Create

- [ ] `/admin/coach/training-plans/new` открывается.
- [ ] Команда по умолчанию — `Олімп Футзал`.
- [ ] Сохранение без названия показывает validation error.
- [ ] Сохранение без единого блока показывает validation error.
- [ ] План только с собственным блоком успешно сохраняется.
- [ ] Metadata сохраняются: title, date, team, age group, objective, notes, intensity.

## 3. Exercise Library

- [ ] Загружаются только упражнения со status `active`.
- [ ] Поиск работает по коду, названию и украинскому названию категории.
- [ ] Category filter работает.
- [ ] Добавление показывает code, title, category и duration в структуре.
- [ ] Повторное добавление требует явного подтверждения.
- [ ] Cancel в confirmation не добавляет дубль.
- [ ] Confirm добавляет вторую копию.

## 4. Blocks

- [ ] Кнопка `Додати власний блок` создаёт ручной блок без связи с Exercise Library.
- [ ] У собственного блока редактируются title, block type, description, duration и notes.
- [ ] Собственный и библиотечный блоки можно использовать в одном плане.
- [ ] Старый custom block открывается и остаётся редактируемым.
- [ ] Duration можно очистить во время ввода и затем указать значение 1–300 минут.
- [ ] В поле duration нет наложения нативных стрелок браузера на суффикс `хв`.
- [ ] Невалидная duration блокирует сохранение.
- [ ] Notes сохраняются отдельно для каждого блока.
- [ ] Кнопки вверх/вниз меняют порядок.
- [ ] Первая кнопка вверх и последняя вниз disabled.
- [ ] Удаление блока обновляет порядок и итоговое время.
- [ ] Общая duration пересчитывается после add/edit/remove/reorder.

## 5. Save and Reload

- [ ] Save создаёт один `training_plans` record.
- [ ] Save создаёт корректное количество `training_plan_blocks`.
- [ ] `exercise_id` соответствует выбранным упражнениям, а для собственных блоков сохраняется `null`.
- [ ] `sort_order` сохраняется как 0...N-1.
- [ ] `planned_duration` равна сумме block duration.
- [ ] После Save Create redirect ведёт на `/admin/coach/training-plans/[id]`.
- [ ] После reload metadata, упражнения, notes, duration и порядок не меняются.
- [ ] Повторный Save не создаёт второй план.
- [ ] Повторный Save атомарно обновляет blocks.

## 6. Unsaved Changes

- [ ] Изменение metadata включает индикатор незбережённых изменений.
- [ ] Добавление, удаление, reorder и duration change включают индикатор.
- [ ] Browser refresh показывает native warning.
- [ ] Back, sidebar link и Cancel требуют confirmation.
- [ ] Отмена confirmation оставляет пользователя на странице.
- [ ] После успешного Save warning исчезает.

## 7. Edit and Delete

- [ ] Edit route имеет loading state.
- [ ] Несуществующий ID показывает error state и Retry/Back.
- [ ] Status можно изменить в Edit.
- [ ] Delete требует confirmation.
- [ ] Delete удаляет plan и связанные blocks.

## 8. Regression

- [ ] Exercise Library list/create/details/edit открываются.
- [ ] Content Import открывается.
- [ ] Media Import открывается.
- [ ] Coach navigation подсвечивает `Плани тренувань` на list/new/edit.
- [ ] Existing plan with legacy custom blocks открывается без crash.
- [ ] Existing `training_id` остаётся в БД после Save.

## 9. Responsive

- [ ] Desktop 1440 px.
- [ ] Tablet 768 px.
- [ ] Mobile 390 px.
- [ ] Mobile 320 px.
- [ ] Library, metadata, block actions и Save доступны без горизонтального скролла.
