# Sprint 05.1 — Training Templates & Plan Duplication

## Delivered

- plan duplication from list and editor;
- save current plan as template;
- create and edit templates;
- create independent plans from templates;
- template search and filters;
- archive, restore and delete flows;
- Coach Workspace navigation integration;
- Supabase tables, RLS and atomic template-save RPC;
- QA checklist and validation report.

## Routes

- `/admin/coach/training-templates`
- `/admin/coach/training-templates/new`
- `/admin/coach/training-templates/[id]`
- `/admin/coach/training-plans/new?template=<uuid>`

## Database

Run:

`sql/2026-08-03-training-templates-and-plan-duplication.sql`

## Compatibility

Existing plans and Sprint 05.0 save/edit flows remain unchanged.

## Next

`Sprint 05.2 — Training Publish Flow`.
