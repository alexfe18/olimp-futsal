# Sprint 05.0.1 — Training Builder QA Fixes Validation Report

- Generated: 2026-08-02T20:15:45.535850+00:00
- Structural checks: 21
- Passed: 21
- Failed: 0

## Automated structural checks

| Check | Result |
|---|---|
| Manual block factory exists | PASS |
| Manual block has nullable exercise link | PASS |
| Manual block button exists | PASS |
| Manual block title editor exists | PASS |
| Manual block type editor exists | PASS |
| Manual block description editor exists | PASS |
| Manual-only client validation allowed | PASS |
| Manual duration supports temporary empty value | PASS |
| Native number spinners hidden | PASS |
| Minute suffix ignores pointer events | PASS |
| Create/Edit Hero has no sprint number | PASS |
| List Hero has no sprint number | PASS |
| List Hero uses production title | PASS |
| Mixed plan wording is present | PASS |
| Block counters use block terminology | PASS |
| Base SQL allows manual-only plans | PASS |
| Incremental SQL allows manual-only plans | PASS |
| Incremental SQL recreates save RPC | PASS |
| Manual blocks preserve nullable exercise_id | PASS |
| QA checklist added | PASS |
| Release note added | PASS |

## Tool verification

- `tsc --noEmit` — PASS.
- Scoped ESLint for changed Training Builder files — PASS.
- `npm run build` — not confirmed in this container: Next.js attempted to download `@next/swc-linux-x64-gnu@16.2.10`, and the internal package mirror returned HTTP 404.

## Browser QA still required

- Apply `sql/2026-08-02-training-builder-manual-blocks-fix.sql` if Sprint 05.0 SQL was already executed.
- Verify manual-only and mixed plans in the connected Supabase environment.
- Verify duration input in Chrome and Firefox on macOS.