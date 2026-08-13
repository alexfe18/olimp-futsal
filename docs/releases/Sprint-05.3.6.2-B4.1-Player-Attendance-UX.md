# Sprint 05.3.6.2 — B.4.1 Player Attendance Status & Navigation UX

Source capture confirmed that the player training detail page supported only
`yes | no` at the UI/type layer even though the Attendance API already supports
`yes | maybe | no`.

B.4.1 closes that UI gap without changing the database or attendance API.

Changes:
- `PlayerAttendanceStatus` becomes `yes | maybe | no`
- loading an existing `maybe` response now preserves it
- save responses preserve `maybe`
- new `? Під питанням` action
- amber active state for `maybe`
- `Ваша участь під питанням` heading
- dedicated success message for `maybe`
- attendance buttons use 3 columns on desktop and stack on smaller screens
- bottom navigation:
  - `← До тренувань` -> `/player/trainings`
  - `До кабінету →` -> `/player`

Preserved:
- authenticated Bearer-token API flow
- `/api/attendance/respond`
- `get_my_training_attendance`
- existing yes/no behavior
- B.4 test-target safety
- Push disabled state
- training visibility/access gates
