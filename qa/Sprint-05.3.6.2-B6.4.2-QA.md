# B.6.4.2 QA

## A. Fresh Private Window
1. Open `/training`.
2. Anonymous counts-only board should render.
3. Click `Відповісти на тренування` -> `Так, увійти`.
4. Login as DEV Player.
5. Login must return directly to `/training`, not `/player`.
6. Authenticated `/training` should show RSVP + names.

Expected console after login:
- `[auth] login session persisted { authenticated: true, ... }`
- `[training-board] session ready { authenticated: true, expiresInSeconds: ... }`
- `[training-board] viewer { authenticated: true, canViewNames: true, canRespond: true, hasPlayer: true }`

## B. Persistence
Keep `/training` open for at least 2 minutes and refresh once.
It must remain authenticated.

If authentication disappears, send only these log objects:
- `[training-board] auth event`
- `[training-board] session ready`

The `expiresInSeconds` value will show whether the DEV Supabase JWT lifetime is abnormally short.

## C. Regression
- `/player` remains authenticated.
- `/player/profile` remains authenticated.
- `/player/trainings` RSVP/counts remain synchronized.
- Logout still signs out.
