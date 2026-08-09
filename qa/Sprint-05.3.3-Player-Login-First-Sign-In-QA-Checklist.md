# Sprint 05.3.3 — Player Login & First Sign-in QA Checklist

## Preconditions
- [ ] Sprint 05.3.2 is PASS: 19 Auth users / 19 profiles / 18 linked player accounts.
- [ ] SQL migration `2026-08-08-sprint-05.3.3-player-login-first-sign-in.sql` is applied.
- [ ] Supabase Phone authentication is enabled before runtime phone/password QA.
- [ ] Use one real provisioned player from the private credentials ledger; never paste credentials into Jira/Git/chat.

## Login
- [ ] `/login` accepts `+380XXXXXXXXX`.
- [ ] `380XXXXXXXXX` normalizes to `+380...`.
- [ ] `0XXXXXXXXX` normalizes to `+380...`.
- [ ] Wrong phone/password shows a generic error.
- [ ] Unknown phone does not reveal whether the account exists.
- [ ] Successful player login creates a valid session.
- [ ] Owner/admin existing login remains functional.

## First sign-in
- [ ] Player with `must_change_password=true` is redirected to `/account/change-password`.
- [ ] Direct `/player` access redirects to password change while the flag is true.
- [ ] Direct `/admin` access also redirects to password change while the flag is true.
- [ ] Password shorter than 10 chars is rejected by the UI.
- [ ] Password confirmation mismatch is rejected.
- [ ] Successful password update calls `complete_first_sign_in()`.
- [ ] `profiles.must_change_password` becomes `false`.
- [ ] An `auth.first_sign_in_completed` audit row is written once.
- [ ] Refresh after completion does not return to the password-change screen.

## Player access
- [ ] Player lands on `/player`.
- [ ] Player context shows the correct profile/team.
- [ ] Player cannot access `/admin`.
- [ ] Player logout clears the session and returns to `/login`.
- [ ] Refreshing `/player` with an active session keeps the user signed in.
- [ ] Sporting-inactive player with active membership/account can sign in and sees sporting status as inactive.

## Admin regression
- [ ] `/admin/login` remains available without a session.
- [ ] Owner can sign in and access `/admin`.
- [ ] Owner is not redirected to `/player`.
- [ ] Existing admin routes still render behind the new layout gate.

## Security
- [ ] Public signup is still absent.
- [ ] No service/secret key is shipped to the browser.
- [ ] Player context RPC returns only the authenticated user's profile/membership.
- [ ] `complete_first_sign_in()` only updates `auth.uid()`.
- [ ] Private credential CSV remains ignored by Git.
