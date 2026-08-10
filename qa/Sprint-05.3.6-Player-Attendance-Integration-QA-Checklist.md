# Sprint 05.3.6 — Player Attendance Integration — QA Checklist

## Automated / baseline
- [ ] version `0.6.0-alpha.8`
- [ ] typecheck PASS
- [ ] build PASS
- [ ] static verification PASS
- [ ] DB migration PASS
- [ ] DB verification PASS

## Safe local default
- [ ] `ATTENDANCE_WRITE_MODE` unset or `disabled`
- [ ] player detail displays current persisted RSVP
- [ ] clicking `Буду` returns HTTP 200 but logs `[attendance] SUPPRESSED`
- [ ] clicking `Не буду` returns HTTP 200 but logs `[attendance] SUPPRESSED`
- [ ] DB row is not changed
- [ ] public `/training` submit is also suppressed locally

## Controlled test mode
Configure exactly:
- `ATTENDANCE_WRITE_MODE=test`
- `ATTENDANCE_TEST_PLAYER_ID=<selected player UUID>`
- `ATTENDANCE_TEST_TRAINING_ID=<selected active training UUID>`

Then:
- [ ] selected test player can save `Буду`
- [ ] reload keeps `Буду`
- [ ] player can change to `Не буду`
- [ ] reload keeps `Не буду`
- [ ] another player/training combination is suppressed
- [ ] `responded_by_profile_id` is filled for authenticated player-area write

## Player security
- [ ] player cannot open another team's training detail
- [ ] player response resolves from logged-in profile, not request player ID
- [ ] player cannot change `actual_status`
- [ ] player cannot change `coach_note`
- [ ] player cannot change `marked_at`
- [ ] completed/cancelled/unpublished training cannot accept response

## Admin regression
- [ ] `/admin/attendance/[trainingId]` loads
- [ ] coach can mark actual attendance
- [ ] coach note saves
- [ ] using voting answers still works
- [ ] existing RSVP is preserved when coach saves actual attendance

## Public `/training` regression
- [ ] accessible in Incognito without login
- [ ] active training loads
- [ ] RSVP list loads
- [ ] in test mode, configured test player can submit
- [ ] in disabled mode, submit is safely suppressed
- [ ] no redirect to `/login`

## Push regression
- [ ] local training publish still logs `[push] SUPPRESSED`
- [ ] attendance response does not trigger Push in this sprint
