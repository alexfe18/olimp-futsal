# Sprint 05.0.5 — Training Builder QA Checklist

## Quick View actions

- [ ] Open an existing plan containing library exercises.
- [ ] Every library exercise shows `Переглянути вправу`.
- [ ] Every library exercise shows `Відкрити сторінку ↗`.
- [ ] Manual blocks do not show library actions.
- [ ] Quick View opens without leaving the plan.
- [ ] Full page opens in a new browser tab.
- [ ] Unsaved plan changes remain after opening and closing Quick View.

## Link recovery

- [ ] Existing exercise is recognized by direct `exerciseId`.
- [ ] Existing exercise can be recovered by code such as `ATK-008`.
- [ ] Exact-title fallback works when the code is unavailable.
- [ ] While the library is loading, actions remain visible but disabled.
- [ ] Saving the plan persists the recovered exercise link.
- [ ] Reopen the plan and confirm both actions remain available.

## Hero age metric

- [ ] `U8–U10` is displayed in full.
- [ ] `U13–U14` is displayed in full.
- [ ] `U15–U17` is displayed in full.
- [ ] `Дорослі` is displayed in full.
- [ ] Hero metrics do not overlap on desktop or tablet widths.

## Regression

- [ ] Manual block create/edit/save still works.
- [ ] Exercise order, duration and notes still save.
- [ ] Duplicate exercise counter still works.
- [ ] SQL migration is not requested.
