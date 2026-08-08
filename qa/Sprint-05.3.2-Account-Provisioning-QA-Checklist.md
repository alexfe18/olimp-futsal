# Sprint 05.3.2 — Account Provisioning QA Checklist

## Preflight

- [ ] Sprint 05.3.1 `verify:db-foundation` PASS.
- [ ] 19 players / 19 active contacts.
- [ ] 18 prepared account requests.
- [ ] 1 not-requested account: Сокур Дмитро Юрійович.
- [ ] 19 adult memberships, all access-active.
- [ ] 0 memberships linked to player profiles before provisioning.
- [ ] 1 existing Auth user / Owner before provisioning.
- [ ] Fresh DB backup created.

## Migration

- [ ] `2026-08-07-sprint-05.3.2-account-provisioning.sql` executes successfully.
- [ ] finalizer RPC executable by `service_role` only.
- [ ] rollback-preparation RPC executable by `service_role` only.

## Dry-run

- [ ] create_accounts = 18.
- [ ] already_provisioned = 0.
- [ ] accounts_not_requested = 1.
- [ ] invalid_rows = 0.
- [ ] review_rows = 0.
- [ ] Auth and DB counts unchanged.

## Apply

- [ ] 18 phone Auth users created.
- [ ] all 18 phones confirmed.
- [ ] private credentials ledger created under `private-imports/generated/` and chmod 600.
- [ ] no password or full phone written to audit-output.
- [ ] 18 contacts set to `provisioned`.
- [ ] 18 profiles active with `must_change_password = true`.
- [ ] 18 adult memberships linked to profiles.
- [ ] all 19 adult memberships remain `active`.
- [ ] 18 active global `member` assignments.
- [ ] Owner remains active and unchanged.

## Exact player checks

- [ ] Григор’ян Едуард: `players.is_active = false`.
- [ ] Григор’ян Едуард: adult membership = `active`.
- [ ] Григор’ян Едуард: account/contact = `provisioned`.
- [ ] Сокур Дмитро Юрійович: `not_requested` and no profile link.

## Regression

- [ ] `npm run typecheck` PASS.
- [ ] `npm run build` PASS.
- [ ] `npm run verify:db-foundation` PASS after account provisioning.
- [ ] `npm run verify:account-provisioning` PASS.
- [ ] private files ignored by Git.
