# Sprint 05.3.6.2 — B.4.1 Player Attendance Status & Navigation UX QA

## Static / build

- [ ] Version is `0.6.0-alpha.10`
- [ ] Typecheck passes
- [ ] Build passes
- [ ] Static verifier passes
- [ ] No DB migration
- [ ] Existing B.4 attendance `test` mode is preserved
- [ ] Push remains disabled

## Player training detail

Expected attendance choices:
- [ ] `✓ Буду`
- [ ] `? Під питанням`
- [ ] `✕ Не буду`

Expected active states:
- [ ] yes -> green
- [ ] maybe -> amber
- [ ] no -> red

Expected state copy:
- [ ] yes -> `Ви будете на тренуванні`
- [ ] maybe -> `Ваша участь під питанням`
- [ ] no -> `Ви не будете на тренуванні`

Expected success copy:
- [ ] maybe -> `Готово. Ви поки не впевнені щодо участі у тренуванні.`

## Navigation

At the bottom of the training card:
- [ ] `← До тренувань` -> `/player/trainings`
- [ ] `До кабінету →` -> `/player`

The existing top `← Усі тренування` link remains.

## Resume B.4 smoke

Use the current B.4 synthetic DEV training.

1. Select `Буду` -> save -> reload -> yes persists.
2. Select `Під питанням` -> save -> reload -> maybe persists.
3. Select `Не буду` -> save -> reload -> no persists.
4. Terminal must log `[attendance] SAVED`, runtime local, mode test, authenticated true.
5. Run the existing B.4 Final Verify.
6. Expected final DB state:
   - exactly one attendance row
   - status = no
   - authenticated profile attribution present
   - no duplicate attendance row
   - push subscriptions = 0
