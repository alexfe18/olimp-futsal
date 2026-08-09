# Sprint 05.3.5 — Player Training Visibility — QA Checklist

## Automated baseline

- [ ] `npm run typecheck` PASS
- [ ] `npm run build` PASS
- [ ] `npm run verify:player-training-visibility` PASS
- [ ] DB migration executed successfully
- [ ] DB verification JSON PASS

## Baseline state from preflight

At the start of Sprint 05.3.5 the Production database had:

- 5 training rows total;
- 0 active training rows;
- 0 scheduled training rows;
- 0 published training plans;
- 19 adult player memberships, 18 linked to Auth profiles.

Therefore the first expected Player UI state is EMPTY until a future training is published.

## Manual Player QA

1. Log in as an active adult-team player.
2. Open `/player/trainings`.
   - Expected before publication: empty state, no error.
3. Open a known completed/cancelled training ID under `/player/trainings/<id>`.
   - Expected: “Тренування недоступне”, no historical/internal data.
4. As Owner/Admin, create or use a future plan assigned to `Олімп Футзал` / adult team.
5. Publish it through the normal Training Publish Flow.
6. Log in as player and open `/player/trainings`.
   - Expected: published active training appears with title/date/time/location.
7. Open its details route.
   - Expected: same organizational information; no coach notes, objective, blocks or methodology.
8. Refresh the details route.
   - Expected: session persists; route remains available.
9. Unpublish/deactivate/cancel the training through the normal Admin flow.
10. Refresh Player list/detail.
    - Expected: training disappears from list and direct detail URL becomes unavailable.
11. Anonymous/private browser → `/player/trainings`.
    - Expected: redirect to `/login`.
12. Player → `/admin`.
    - Expected: redirect to `/player`.

## Admin regression after RLS hardening

- [ ] Admin can open training plans.
- [ ] Admin can create/save a draft for adult team.
- [ ] Admin can edit blocks.
- [ ] Admin can move plan to Planned.
- [ ] Admin can Publish.
- [ ] Admin can Unpublish/Deactivate.
- [ ] Existing `/training` public attendance page can still read the active scheduled training.

## Security expectations

- Anonymous users cannot read completed/cancelled/unpublished training rows.
- Players can read only active scheduled training rows for a team where they have an active membership/permission.
- Players do not have direct SELECT access to `training_plans` or `training_plan_blocks`.
- Full plan methodology remains staff-only.
