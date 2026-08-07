SPRINT 05.3.1 — DATABASE FOUNDATION DATASET-ALIGNMENT PATCH

Target branch:
  sprint/05.3-users-roles-teams

This archive REPLACES the previously installed Sprint 05.3.1 patch files. Do not run the old migration; replace these files first.
It is prepared for the confirmed Production baseline:
  19 players / 18 sporting-active / 1 sporting-inactive

Corrected behavior:
- all 19 current players receive active adult-team access membership;
- players.is_active remains the separate sporting/availability status;
- the injured inactive player can be prepared for a future account;
- legacy team_name values `Олімп Футзал` and `Дорослі` map to the adult team;
- QA/verification expectations are updated to 19 players.

INSTALL / REPLACE

1. Extract this ZIP.
2. Copy the ENTIRE content of this patch folder into the project root.
   Recommended command (adjust only the extracted folder path if necessary):

   rsync -av \
     ~/Desktop/sprint-05.3.1-dataset-fix/Sprint-05.3.1-Database-Foundation-Dataset-Fix/ \
     ~/Desktop/olimp-release-0.5/olimp-futsal/

3. Confirm:
   cd ~/Desktop/olimp-release-0.5/olimp-futsal
   git branch --show-current
   node -p "require('./package.json').version"

   Expected:
   sprint/05.3-users-roles-teams
   0.6.0-alpha.2

4. Re-run local checks:
   rm -rf .next
   npm ci
   npm run typecheck
   npm run build

5. IMPORTANT PRIVATE CSV:
   private-imports/adult-team-contacts.csv is intentionally NOT included.
   Add the new 19th player locally before contact dry-run.
   The injured player must use player_status=inactive but create_account=true.

6. Database order in Supabase SQL Editor:
   a) sql/2026-08-05-sprint-05.3.1-preflight.sql
   b) Make/confirm database backup.
   c) sql/2026-08-05-sprint-05.3.1-database-foundation.sql
   d) sql/2026-08-05-sprint-05.3.1-verification.sql

IMPORTANT OWNER RULE:
- If preflight shows exactly one Auth user, migration selects it as Owner.
- If more than one Auth user exists, edit v_initial_owner_id before migration.

7. Terminal verification:
   npm run verify:db-foundation

8. Private contact dry-run:
   npm run import:player-contacts -- \
     --file private-imports/adult-team-contacts.csv

9. Apply only after dry-run PASS:
   npm run import:player-contacts -- \
     --file private-imports/adult-team-contacts.csv \
     --apply \
     --confirm IMPORT_CONTACTS

10. Repeat verification SQL and terminal verification.

SECURITY:
- private-imports/ and audit-output/ must not appear in git status.
- This sprint prepares account requests but creates zero player Auth accounts.
- Do not run npm audit fix --force as part of this patch.
