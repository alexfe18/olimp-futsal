Sprint 05.3.1 — Database Foundation

1. Use Node.js 22:
   nvm use 22

2. Install/refresh project files from the merge-ready patch.

3. Run local checks:
   npm ci
   npm run typecheck
   npm run build

4. In Supabase SQL Editor run:
   sql/2026-08-05-sprint-05.3.1-preflight.sql
   sql/2026-08-05-sprint-05.3.1-database-foundation.sql
   sql/2026-08-05-sprint-05.3.1-verification.sql

5. Verify from terminal:
   npm run verify:db-foundation

6. Dry-run private contacts:
   npm run import:player-contacts -- --file private-imports/adult-team-contacts.csv

7. Apply only after dry-run PASS:
   npm run import:player-contacts -- --file private-imports/adult-team-contacts.csv --apply --confirm IMPORT_CONTACTS

8. Repeat SQL and terminal verification.

No player Auth accounts are created in Sprint 05.3.1.

Confirmed baseline: 19 players / 18 sporting-active / 1 sporting-inactive; all 19 access memberships active.
