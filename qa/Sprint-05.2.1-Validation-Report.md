# Sprint 05.2.1 — Validation Report

Generated: 2026-08-04

## Automated checks

| Check | Result |
|---|---|
| TypeScript (`npm run typecheck`) | PASS |
| Scoped ESLint for changed TS/TSX files | PASS |
| Structural contract checks | 43 / 43 PASS |
| SQL quote / dollar-block / parentheses balance | PASS |
| SQL function inventory | 16 / 16 PASS |
| Required RPC references | PASS |
| Duplicate source files (`* 2.tsx`, etc.) | NONE |
| Trailing whitespace in core changed files | NONE |
| Secret files in source tree | NONE |

## Build status

`next build --webpack` could not reach application compilation in the container.
Next.js attempted to download `@next/swc-wasm-nodejs@16.2.10`, but the internal
package mirror returned HTTP 404 and no Linux SWC binary was installed.

This is an environment limitation, not a confirmed application-code failure.
A successful `npm run build` on the user's Mac is required before Preview QA.

## Database status

The migration passed static structural checks only. It was not executed against
the user's Supabase project from this environment.

Required migration order:

1. `sql/2026-08-03-training-publish-flow.sql`
2. `sql/2026-08-04-plan-training-integration-ux-completion.sql`

## Runtime QA still required

- Draft → Planned creates exactly one inactive linked training.
- Planned → Published activates the same UUID without duplication.
- Plan ↔ Training navigation and hash scrolling.
- Bidirectional date/time/location/team synchronization.
- Publish/update/cancel/restore Push delivery.
- No Push on methodology-only or unchanged organizational saves.
- Attendance continuity across unpublish/cancel/restore/complete.
- Manual-training regression.
- Desktop and mobile layout.

Use `qa/Sprint-05.2.1-Plan-Training-Integration-QA-Checklist.md` for the full run.
