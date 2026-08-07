# Sprint 05.3.1 — Package Validation Report

## Completed checks

- Node scripts syntax: **PASS** (`node --check`).
- Access catalog TypeScript files: **PASS** with standalone `tsc`.
- Permission catalog consistency: **PASS** — 82 unique codes in SQL and TypeScript.
- System role catalog: **PASS** — 6 global + 5 team roles.
- SQL structural scan: **PASS** — balanced dollar quotes and parentheses in all 05.3.1 SQL files.
- Patch/full private-data scan: **PASS** — no private import CSV, audit output, `.env.local`, `node_modules` or `.next`.
- Private data included in project package: **NO**.
- Auth account creation code: **NO**.
- Legacy RLS policy removal: **NO**.
- Team compatibility trigger: **INCLUDED** (`Олімп Футзал` + `Дорослі` adult aliases).
- Preflight / migration / verification SQL: **INCLUDED**.
- Dry-run + explicit-confirm private contact import: **INCLUDED**; sporting status no longer disables team access membership.
- Type-safe permission/role constants: **INCLUDED**.


## Dataset-alignment patch checks

- Confirmed baseline updated to **19 players / 18 sporting-active / 1 sporting-inactive**.
- Adult access membership is active for every current player card, independent from `players.is_active`.
- Legacy adult-team aliases `Олімп Футзал` and `Дорослі` are covered by migration and verification.
- Modified Node verification script: **PASS** (`node --check`).
- Modified SQL files: **PASS** structural scan (dollar quotes, parentheses, required markers).
- Private-data scan: **PASS** — no filled contact CSV or credentials are included.
- Full `npm ci` in the packaging container remains blocked by the internal mirror 404 for `zod-validation-error@4.0.2`; rerun the normal checks on the user's Mac after replacement.

## Environment limitation

Full `npm ci`, project-wide TypeScript and Next.js build could not run in the packaging container because the internal npm mirror returned 404 for `zod-validation-error@4.0.2`. This is an environment/package-mirror failure before application compilation, not a verified project build result.

The following remain mandatory on the user's Mac with Node 22:

```bash
npm ci
npm run typecheck
npm run build
```

## Supabase-dependent checks

These must run against the user's project:

- SQL preflight;
- transactional foundation migration;
- SQL verification;
- contact dry-run/apply;
- `npm run verify:db-foundation`;
- Training/Attendance/Push regression.

## Expected verified dataset

```text
adult teams: 1
players: 19
adult player memberships: 19 (all membership status active)
active players: 18
inactive players: 1 (sporting status only)
contacts after apply: 19
accounts prepared: 18
accounts not requested: 1
Auth accounts created in 05.3.1: 0
```
