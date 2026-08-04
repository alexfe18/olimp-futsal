SPRINT 05.2.1 — PLAN ↔ TRAINING INTEGRATION & UX COMPLETION

PACKAGE TYPE
Merge-ready patch for the current sprint/05.2-training-publish-flow branch.
Apply after Sprint 05.2 source and SQL migration.

PRODUCT MODEL
- Training Plan stores methodology: exercises, blocks, order, duration and coach notes.
- Training stores the concrete event: date, time, location, team, lifecycle, Push and Attendance.
- Draft creates no training.
- Planning creates one inactive linked training.
- Publishing activates that same UUID.
- Repeated planning/publication updates the same linked training and never creates a duplicate.

INSTALL
1. Copy this package over the project root, preserving relative paths.
2. Run the required migration in Supabase SQL Editor:
   sql/2026-08-04-plan-training-integration-ux-completion.sql
3. Restart the local app and clear stale localhost Service Worker data if an old bundle is shown.
4. Run:
   npm ci
   npm run typecheck
   npm run build
   npm run dev

NEW/UPDATED FLOWS
- Plan → linked Training and Training → linked Plan navigation.
- Read-only plan summary in /admin/trainings.
- Date/time/location/team synchronization in both directions.
- Existing Push notifications for publish, organizational update, cancel and restore.
- Attendance links reuse the same training_id.
- Manual trainings without plans continue to work.

REQUIRED ENVIRONMENT VARIABLES
No new variables. Existing Push flow requires:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT

DATABASE
SQL required: YES.
Run after sql/2026-08-03-training-publish-flow.sql.

QA
Use qa/Sprint-05.2.1-Plan-Training-Integration-QA-Checklist.md.
Runtime Supabase, Push, browser and mobile QA must be completed locally/Preview.

NOT INCLUDED
- Team Plan Visibility — Sprint 05.3.
- General club calendar — Sprint 05.4.
- Team chat/sharing — later scope.
