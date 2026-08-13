# Sprint 05.3.6.2 — B.3.2 DEV Access Linking QA

Expected verification:

- auth_users = 2
- profiles = 2
- players = 1
- memberships = 1
- user_roles = 1
- attendance_rows = 0
- push_subscriptions = 0

Owner:
- email = dev.owner@example.com
- account_status = active
- role = owner
- role_scope = global
- role_active = true

Player:
- email = dev.player@example.com
- account_status = active
- must_change_password = true
- shirt_number = 99
- team_code = adult
- team_name = Олімп Футзал
- team_role = player
- membership_status = active
- is_primary = true

Do not log into the application yet. B.3.3 will make `/login` environment-aware
so DEV accepts email/password while PROD continues phone/password.
