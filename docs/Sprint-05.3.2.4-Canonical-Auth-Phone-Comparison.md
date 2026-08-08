# Sprint 05.3.2.4 — Canonical Auth Phone Comparison

## Root cause

Supabase Auth can persist a phone as digit-only international form (for example `380...`) even when Admin `createUser()` receives project-canonical `+380...`.

The project intentionally stores `player_contacts.phone_e164` and `profiles.phone_e164` as strict `+E164`. The 05.3.2 finalizer compared `auth.users.phone` to the prepared contact with a byte-for-byte equality check, so all 18 Auth users could be created successfully and the batch finalization would still fail on the first player.

## Fix

- Keep project data strict `+E164`.
- Canonicalize Auth phone values before comparison in the database finalizer.
- Canonicalize Auth phone values in provisioning duplicate/recovery checks.
- Canonicalize Auth phone values in post-provision verification.
- Do not modify existing contact/profile phone values.
