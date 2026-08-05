# Current Product State

Последнее обновление: 2026-08-04

## Текущий приоритет

Sprint 05.3.0 — DB/RLS Audit, Adult-Team Mapping & Design Freeze.

## Coach Workspace

| Модуль | Состояние | Следующее действие |
|---|---|---|
| Exercise Library | Готово и deployed | Regression |
| Content/Media Import | Готово и deployed | Использовать по необходимости |
| Training Builder Foundation | Готово и deployed | Regression |
| Training Templates & Duplication | Готово и deployed | Regression |
| Training Publish Flow | Released | Regression |
| Plan ↔ Training integration | Released | Regression |
| Push delivery integration | Работает | Перевести получателей на team/profile scope после RBAC |
| Users, Roles & Teams Foundation | Sprint 05.3.0 started | Audit & design freeze |
| Team Plan Visibility | Не начато | После Sprint 05.3 |
| Club Calendar | Не начато | После Team Plan Visibility |

## Текущий релиз разработки

`0.6.0-alpha.1 — Sprint 05.3.0 Audit & Design Freeze`

## Подтверждённый pilot scope

- В системе пока создаётся одна реальная команда: взрослая команда «Олімп Футзал».
- Детские команды не входят в текущую миграцию.
- Подготовлен приватный список из 18 игроков взрослой команды.
- 17 игроков отмечены для будущего создания аккаунтов.
- 1 игрок остаётся в составе без аккаунта на этом этапе.
- Реальные номера телефонов не хранятся в Git и release-архивах.

## Ближайшая контрольная точка

1. Запустить read-only SQL `sql/2026-08-04-sprint-05.3.0-db-rls-audit.sql`.
2. Сохранить результаты RLS/Auth/data-quality audit.
3. Положить приватный CSV в `private-imports/adult-team-contacts.csv`.
4. Выполнить `npm run audit:players-import -- --file private-imports/adult-team-contacts.csv`.
5. Подтвердить matching 18/18 игроков с существующей таблицей `players`.
6. Выполнить `npm run audit:team-mapping` и подтвердить все legacy `team_name`.
7. Зафиксировать initial owner и backup/rollback plan.
8. После PASS перейти к Sprint 05.3.1 — Database Foundation.

## Граница Sprint 05.3.0

Этап является только аудитом и подготовкой migration inputs. Он не создаёт
Supabase Auth users, не записывает номера телефонов в базу и не меняет RLS.
