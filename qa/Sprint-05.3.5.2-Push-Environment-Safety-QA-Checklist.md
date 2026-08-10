# Sprint 05.3.5.2 — Push Environment Safety — QA Checklist

## Automated
- [ ] version = `0.6.0-alpha.7`
- [ ] `npm run typecheck` PASS
- [ ] `npm run build` PASS
- [ ] `npm run verify:push-environment-safety` PASS

## Local default / disabled
- [ ] Start local app without `PUSH_SEND_MODE=live`.
- [ ] Publish or update an active training.
- [ ] Database save/publish succeeds.
- [ ] `/api/training-notifications/send` returns HTTP 200.
- [ ] Terminal contains `[push] SUPPRESSED`.
- [ ] `runtime` is `local`.
- [ ] `sent` is `0`.
- [ ] No real device receives a Push.
- [ ] Player visibility / `/training` behavior remains unchanged.

## Live guard
- [ ] Setting `PUSH_SEND_MODE=live` locally still suppresses Push.
- [ ] Reason is `live_outside_vercel_production`.
- [ ] No real device receives a Push.

## Optional single-player test
- [ ] Set `PUSH_SEND_MODE=test`.
- [ ] Set `PUSH_TEST_PLAYER_ID` to one test player's UUID.
- [ ] Trigger a Push.
- [ ] Only subscriptions belonging to that player are selected.
- [ ] No other player receives the notification.

## Production configuration
- [ ] Vercel Production has `PUSH_SEND_MODE=live`.
- [ ] Vercel Preview has `PUSH_SEND_MODE=disabled`.
- [ ] Production is redeployed after environment-variable changes.
- [ ] Production live Push is tested only when an intentional real notification is acceptable.
