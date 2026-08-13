# Sprint 05.3.6.2 — B.6.1 Player Shell & Dashboard QA

## Automated
Installer must pass:
- branch/version/source-shape guard;
- static B.6.1 verifier;
- `npm run typecheck`;
- `npm run build`.

## Browser QA
Run local DEV as an authenticated DEV Player.

### `/player`
- Shared top navigation appears.
- Player name and team are correct.
- Nearest scheduled published training is shown when available.
- Details opens `/player/trainings/[trainingId]`.
- Additional upcoming trainings appear only when they exist.
- No internal sprint/development placeholder text is visible.
- Admin card is visible only for a user whose context has `can_access_admin=true`.

### `/player/trainings`
- Shared navigation remains visible.
- Existing training list behavior is unchanged.
- PlayerAccessGate still protects the route.

### `/player/trainings/[trainingId]`
- Shared navigation remains visible.
- Existing attendance buttons and DEV Attendance Normal Mode continue to work.

### Mobile
- Bottom navigation contains only working routes: Home and Trainings.
- Active route is visibly selected.
- Content has enough bottom padding not to sit behind the fixed navigation.

## Regression
- Logout redirects to `/login`.
- Player route access guards remain intact.
- `ATTENDANCE_WRITE_MODE=dev` and `PUSH_SEND_MODE=disabled` remain unchanged locally.
