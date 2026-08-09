# Sprint 05.3.4 — QA Checklist

## Automated/local

- [ ] `npm run typecheck` PASS.
- [ ] `npm run build` PASS.
- [ ] `npm run verify:player-access-guards` PASS.
- [ ] Branch is `sprint/05.3-users-roles-teams`.
- [ ] Version is `0.6.0-alpha.5`.

## Logged-out player routes

- [ ] Sign out.
- [ ] Open `/player` directly.
- [ ] Redirects to `/login`.
- [ ] No player content is displayed before access is granted.

## Active player session

- [ ] Login with the player's permanent password.
- [ ] Redirects to `/player`.
- [ ] Refresh `/player` and session remains valid.
- [ ] Player name/team render from shared PlayerSessionContext.
- [ ] No repeated login prompt after refresh.

## First-sign-in enforcement

Use another account only if a safe prepared account still has
`must_change_password = true`.

- [ ] Direct `/player` access redirects to `/account/change-password`.
- [ ] Player content is not shown before password change.

## Role separation

- [ ] As player, manually open `/admin`.
- [ ] Redirects to `/player`.
- [ ] As Owner/Admin without an active adult player membership, manually open
      `/player`.
- [ ] Redirects to `/admin`.

## Session lifecycle

- [ ] From `/player`, click `Вийти`.
- [ ] Redirects to `/login`.
- [ ] Browser Back does not restore usable protected player content.
- [ ] Direct `/player` after logout redirects to `/login`.

## Regression

- [ ] Player permanent password still works.
- [ ] Old temporary password remains invalid.
- [ ] Owner/Admin access still works.
- [ ] Existing `/training` route still opens from the player dashboard.

## Security note

- [ ] No private credential CSV is staged in Git.
- [ ] No database RLS policies were weakened in this sprint.
