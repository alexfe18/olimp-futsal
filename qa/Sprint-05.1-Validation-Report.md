# Sprint 05.1 — Validation Report

Generated: 2026-08-03

## Result

- TypeScript (`npm run typecheck`): **PASS**
- Scoped ESLint for all changed TS/TSX files: **PASS**
- Structural checks: **37 / 37 PASS**
- Required routes and files: **PASS**
- SQL tables, RLS and RPC contract: **PASS**
- Plan duplication flow markers: **PASS**
- Template create/edit/archive/delete flow markers: **PASS**
- Create-plan-from-template cloning flow: **PASS**
- Package version `0.5.1`: **PASS**
- Duplicate source files (`* 2.tsx`, etc.): **NONE**
- Merge conflict markers in changed files: **NONE**
- Trailing whitespace in changed files: **NONE**
- Root secrets/deployment folders: **NONE**

## Production build

`npm run build` could not be completed in the Linux container because Next.js
attempted to download `@next/swc-wasm-nodejs@16.2.10` / Linux SWC binaries from
the internal package mirror, which returned HTTP 404.

The failure occurred before application compilation. TypeScript and scoped
ESLint passed. Run the production build on the user's macOS environment before
pushing or deploying:

```bash
npm ci
npm run typecheck
npm run build
```

## Database validation status

The SQL migration was structurally checked but was **not executed against the
connected Supabase project** in this environment. It must be run manually in
Supabase SQL Editor before opening the new template routes.

Migration:

`sql/2026-08-03-training-templates-and-plan-duplication.sql`

## Runtime QA pending

Use:

`qa/Sprint-05.1-Training-Templates-and-Plan-Duplication-QA-Checklist.md`

The most important runtime checks are template independence, duplicated-plan
independence, archive restrictions and RLS-backed save/delete operations.
