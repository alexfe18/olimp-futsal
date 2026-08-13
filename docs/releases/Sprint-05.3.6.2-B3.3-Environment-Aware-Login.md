# Sprint 05.3.6.2 — B.3.3 Environment-Aware Login

## Decision

Player authentication differs only at the credential identifier layer:

### Development / Preview

- `NEXT_PUBLIC_APP_ENV=development` or `preview`
- Supabase project must be `olimp-futsal-dev`
- Player login uses `email + password`
- Twilio is not configured
- SMS is not used
- Synthetic QA accounts only

### Production

- `NEXT_PUBLIC_APP_ENV=production` or unset
- Supabase project must be the existing Production project
- Player login remains `phone + password`
- Existing Production Twilio/phone authentication remains unchanged

## Safety

`lib/auth/login-environment.ts` validates that the selected application
environment matches the expected Supabase project reference.

This prevents these dangerous combinations:

- DEV email login -> Production database
- Production phone login -> DEV database

When `NEXT_PUBLIC_APP_ENV` is missing, the application defaults to Production
behavior. This is intentional fail-safe behavior so a forgotten env variable
cannot expose the DEV email form on Production.

## Preserved behavior

- Existing session check
- `get_my_access_context`
- account status validation
- `record_my_login`
- first-sign-in `must_change_password`
- Owner redirect to `/admin`
- Player redirect to `/player`
- Admin login page is unchanged

## Environment switch is separate

This patch does NOT edit `.env.local`.

After code verification, the next step is to point local development at the
isolated DEV Supabase project and add:

`NEXT_PUBLIC_APP_ENV=development`

Production should later explicitly use:

`NEXT_PUBLIC_APP_ENV=production`
