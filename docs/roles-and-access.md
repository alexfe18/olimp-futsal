# Roles, Permissions & Team Access

> Foundation version: Sprint 05.3.2 / `0.6.0-alpha.3`

## Core rule

Auth account, application profile, player card, global role and team membership are separate entities.

```text
auth.users → profiles → user_roles → global roles
                    └→ team_memberships → team roles + teams
                                      └→ optional players
```

A player can exist without an account. A coach/manager can exist without a player card. One profile can have multiple global roles and different team roles in different teams.

`players.is_active` is a sporting/availability flag, not an access switch. A temporarily injured player may remain an active team member and keep an active account. Account access is controlled by `profiles.account_status` plus `team_memberships.status`.

## Account statuses

- `invited` — profile created but onboarding is incomplete;
- `active` — permissions and memberships are evaluated;
- `suspended` — access blocked without deleting history;
- `archived` — former club member, no active access.

`is_active_profile()` is a prerequisite for all permission checks.

## Global roles

| Code | Purpose |
|---|---|
| `owner` | Full access, security model and owner assignment. |
| `administrator` | Operational administration except assigning Owner. |
| `club_manager` | Club operations, schedules, teams, roster and communications. |
| `content_manager` | News, gallery and media only. |
| `statistician` | Matches, competitions, standings and statistics. |
| `member` | Basic authenticated profile; team capabilities come from memberships. |

## Team roles

| Code | Purpose |
|---|---|
| `head_coach` | Full methodology/training access in one team. |
| `assistant_coach` | Plan/event editing without global security operations. |
| `team_manager` | Organizational data, roster, attendance and notifications. |
| `player` | Own/player-visible team area. |
| `guardian` | Linked-player access for future youth teams. |

## Effective access

1. Suspended/archived profile is denied.
2. Active global role permissions are combined.
3. For a row with `team_id`, active team-role permissions are added only for that team.
4. `own` and `linked` rules use the profile ↔ player membership and guardian link.
5. UI visibility is not a security boundary; server checks and RLS must repeat authorization.

## Database helper functions

All helpers are under non-exposed `app_private` schema and referenced explicitly by RLS:

```text
app_private.current_profile_id()
app_private.is_active_profile()
app_private.has_global_permission(permission_code)
app_private.has_team_permission(permission_code, team_id)
app_private.is_team_member(team_id)
app_private.is_player_self(player_id)
app_private.is_guardian_of(player_id)
app_private.can_read_team_data(team_id)
app_private.can_manage_team_data(permission_code, team_id)
```

## Foundation limitations

Sprint 05.3.2 provisions the adult pilot player accounts. It still does not yet:

- replace current client-only AdminShell authorization;
- remove broad legacy `authenticated` policies;
- provide Users/Roles/Teams UI;
- provide the player-facing login/password-change UX;
- show training plans to players;
- enable youth teams.

Adult player provisioning rules:

- every provisioned player receives global `member`;
- every provisioned player profile is linked to the existing adult `player` membership;
- membership access status remains independent from `players.is_active`;
- temporary credentials are private local data and never committed to Git.

The remaining changes continue in 05.3.3–05.3.7.
