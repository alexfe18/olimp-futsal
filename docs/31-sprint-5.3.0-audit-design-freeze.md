# Sprint 05.3.0 — DB/RLS Audit, Adult-Team Mapping & Design Freeze

## Pilot scope

Sprint 05.3 starts with one real team only: the adult **«Олімп Футзал»** team.
Youth teams are deliberately postponed until the adult-team pilot, role model and
account lifecycle are stable and the system is ready for presentation to the
sports school administration and coaches.

## Confirmed roster input

The private roster contains 18 adult-team players:

- 14 active;
- 4 inactive;
- 17 selected for future account provisioning;
- 1 player remains roster-only without an account at this stage.

Real phone numbers are private migration inputs. They are never stored in Git,
release archives, documentation or audit screenshots.

## 05.3.0 deliverables

1. Read-only database and RLS audit.
2. Audit of existing `team_name` values in trainings, plans and templates.
3. Final canonical mapping for one adult team.
4. Private CSV validator with phone normalization and duplicate checks.
5. Read-only matching of private roster rows to existing `players` records.
6. Migration readiness report for Sprint 05.3.1.
7. Frozen decision: no Auth users are created and no DB data is changed in 05.3.0.

## Private import policy

The filled CSV must be stored locally under:

```text
private-imports/adult-team-contacts.csv
```

The directory is ignored by Git. Validation reports use masked phone values.
The JSON report may contain full normalized phones for local troubleshooting,
therefore `audit-output/` is also ignored and must not be committed.

## Commands

```bash
npm run audit:players-import -- --file private-imports/adult-team-contacts.csv
npm run audit:team-mapping
```

The player audit works in two modes:

- without Supabase service credentials: local format/duplicate validation;
- with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: read-only
  matching to the existing `players` table.

## Canonical team decision to confirm

Proposed values:

```text
code: adult
name: Олімп Футзал
category: Доросла команда
```

All legacy `team_name` values returned by the audit must be reviewed before the
Sprint 05.3.1 backfill migration is generated.

## Exit criteria

05.3.0 is complete when:

- the SQL audit has been executed and result sets saved;
- all private roster rows are valid;
- 18/18 players are matched to existing `players` records, or exceptions are documented;
- all legacy team names are mapped to the single adult team;
- the initial owner Auth user is identified;
- current broad RLS policies are documented;
- backup and rollback steps are confirmed;
- the migration inputs for 05.3.1 are frozen.
