# B.6.4.1 QA

1. Fresh Private/Incognito window → `/training`.
2. Anonymous protected board should show counts and login gate.
3. `Відповісти на тренування` → `Так, увійти`.
4. Login as DEV Player.
5. Return to `/training` must show the authenticated RSVP form + named Team Attendance Board.

Expected console:
- `[training-board] session ready { authenticated: true }`
- `[training-board] viewer { authenticated: true, canViewNames: true, canRespond: true, hasPlayer: true }`

If the second object instead shows `authenticated: true` with `canRespond: false`, send only that object. The page will also show a dedicated amber access message; then the remaining issue is membership/permission, not login/session hydration.
