# Sprint 05.3.3.2 — Player Access Context Fix QA

Root cause fixed:
- runtime SQL inside `get_my_access_context()` mixed an aggregate/grouped query
  with ORDER BY on non-grouped membership columns.

Required checks:
- [ ] Hotfix SQL returns `Success. No rows returned`.
- [ ] Verification: player_context_runtime_pass = true.
- [ ] Verification: team_code = adult.
- [ ] Verification: team_roles contains player.
- [ ] Verification: must_change_password = true for test player.
- [ ] Verification: can_access_admin = false for player.
- [ ] Verification: owner_context_runtime_pass = true.
- [ ] Verification: owner global_roles contains owner.
- [ ] Verification: owner can_access_admin = true.
- [ ] Real phone+temporary-password login reaches /account/change-password.
- [ ] No SMS/OTP is sent for password login.
- [ ] No player password is pasted into chat/Git/log artifacts.
