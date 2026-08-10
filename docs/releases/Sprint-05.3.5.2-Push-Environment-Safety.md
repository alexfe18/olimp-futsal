# Sprint 05.3.5.2 — Push Environment Safety

## Goal

Prevent local and Preview QA from broadcasting real Push notifications to club players.

## Delivery modes

- `disabled` — no Push is delivered. This is the default.
- `test` — Push is delivered only to `PUSH_TEST_PLAYER_ID`.
- `live` — broadcast/single-recipient delivery is allowed only when both:
  - `VERCEL=1`
  - `VERCEL_ENV=production`

If `PUSH_SEND_MODE=live` is set locally or on Preview, delivery is suppressed.

## Safety behavior

The central `sendPushMessage()` function evaluates the environment before loading subscriptions or VAPID credentials.

Suppressed sends return a successful application result with:

- `sent: 0`
- `suppressed: true`
- runtime/mode/reason metadata

This lets Publish/Update flows complete during QA without alarming the whole team.

## Configuration

Local development:
- no variable is required; default is `disabled`.
- optional explicit value: `PUSH_SEND_MODE=disabled`.

Safe single-player Push test:
- `PUSH_SEND_MODE=test`
- `PUSH_TEST_PLAYER_ID=<player UUID>`

Vercel Preview:
- `PUSH_SEND_MODE=disabled` (recommended)

Vercel Production:
- `PUSH_SEND_MODE=live`

Important: changing Vercel environment variables requires a new deployment before the new value applies.

## Database

No migration is required.
No Push subscriptions are deleted or modified by this sprint.
