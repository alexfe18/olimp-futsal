# DEV Authentication Strategy — Sprint 05.3.6.2

## DEV

- Supabase project: olimp-futsal-dev
- Authentication identifier: email
- Password authentication: yes
- Twilio: not configured
- SMS: not used
- Accounts: synthetic QA only

## PROD

- Supabase project: olimp-futsal
- Authentication identifier: phone
- Password authentication: yes
- Twilio/SMS configuration: unchanged
- Accounts: real club accounts

B.3.2 links the already-created DEV Auth profiles to application authorization:
- DEV Owner -> global owner role
- DEV Player -> active adult-team membership with team-scoped player role

The next step (B.3.3) changes only the application login UI/submit behavior by
environment. Authorization after sign-in continues to use the existing profile,
role and team-membership model.
