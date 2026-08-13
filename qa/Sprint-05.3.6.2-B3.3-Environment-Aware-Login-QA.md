# Sprint 05.3.6.2 — B.3.3 QA Checklist

## Static

- [ ] Version is `0.6.0-alpha.9`
- [ ] Typecheck passes
- [ ] Build passes
- [ ] Verification script passes
- [ ] Admin login implementation is unchanged

## DEV — after `.env.local` is switched to isolated DEV

Expected `/login`:
- [ ] DEV badge is visible
- [ ] Email field is displayed
- [ ] Phone field is not displayed
- [ ] DEV Player can sign in by email/password
- [ ] DEV Player is redirected to password change on first sign-in
- [ ] After password change, DEV Player can access `/player`
- [ ] DEV Owner can sign in through `/login`
- [ ] DEV Owner is routed to `/admin`
- [ ] DEV Player cannot access admin routes

## Production regression — later release smoke

- [ ] `/login` shows phone field, not email
- [ ] Existing phone/password login works
- [ ] Existing first-sign-in flow works
- [ ] No DEV badge appears
- [ ] Twilio/Production configuration remains unchanged
