# Sprint 05.3.5 — Player Training Visibility

Release: `0.6.0-alpha.6`

## Goal

Connect the protected Player Area to the existing Training Publish Flow without exposing coach methodology or unrelated team data.

## Player routes

- `/player/trainings` — active published/scheduled training list for the authenticated player's team.
- `/player/trainings/[trainingId]` — safe organizational detail projection.

The Player Home “Тренування” card now points to `/player/trainings` instead of the legacy public `/training` attendance page.

## Visible player data

- training title;
- date;
- time;
- location;
- team label;
- publication/active state implied by visibility.

Not exposed in this sprint:

- `training_plans.notes`;
- objective/intensity;
- plan blocks;
- coach methodology;
- other-team or unpublished rows.

## RLS hardening

The preflight detected legacy permissive policies that allowed public reads of every `trainings` row and public CRUD on `training_plans` / `training_plan_blocks`.

Sprint 05.3.5 replaces those policies with permission/team-scoped policies:

- anonymous users may read only an active `scheduled` training required by the existing public `/training` flow;
- authenticated players may read only an active `scheduled` training for their own team;
- Owner/authorized staff retain full scoped access through the Sprint 05.3.1 permission catalog;
- training plan methodology is staff-only at table level.

## Important current baseline

The Sprint 05.3.5 preflight found `0` active trainings and `0` published training plans. Therefore an empty Player Trainings screen immediately after migration is expected. A future adult-team training must be published through the normal Admin Publish Flow for positive visibility QA.

## Rollback

`sql/2026-08-09-sprint-05.3.5-rollback.sql` restores the exact legacy RLS policies observed in preflight. It intentionally re-opens broad access and is emergency-only.
