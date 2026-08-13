# B.6.1.1 + B.6.2 QA

## Automated
Installer must PASS:
- branch/version/source-shape guard;
- static verifier;
- `npm run typecheck`;
- `npm run build`.

## Browser — `/player`
- Shared header shows `Кабінет гравця` once.
- Dashboard HERO no longer repeats `Кабінет гравця`.
- `Мій профіль` quick-access card opens `/player/profile`.
- Desktop navigation contains Home / Trainings / Profile.
- Mobile bottom navigation contains Home / Trainings / Profile.

## Browser — `/player/profile`
Authenticated DEV Player #99:
- route opens inside PlayerAccessGate;
- name/team render;
- jersey number should render if the DEV player row contains it;
- position renders when available;
- photo renders when `photo_url` exists, otherwise a safe initial placeholder is shown;
- sporting status renders;
- account status renders;
- DEV account shows email login identifier.

## Regression
- `/player/trainings` still works.
- training detail and attendance still work.
- logout still redirects to `/login`.
- no player/profile writes are made by B.6.2.
- local `ATTENDANCE_WRITE_MODE=dev` remains unchanged.
- local `PUSH_SEND_MODE=disabled` remains unchanged.

## Possible RLS follow-up
If `/player/profile` shows the amber "additional sports data unavailable" message while the basic account/team data still renders, capture only the browser console/Supabase error. That means the `players` read policy needs a targeted authenticated-self read adjustment; do not broaden the policy blindly.
