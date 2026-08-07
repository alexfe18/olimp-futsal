# Private roster/contact imports

Real phone numbers and personal contact data must **not** be committed to Git.

Store the filled file locally under:

```text
private-imports/adult-team-contacts.csv
```

The entire `private-imports/` directory is ignored by Git.

## Audit before Database Foundation

```bash
npm run audit:players-import -- --file private-imports/adult-team-contacts.csv
npm run audit:team-mapping
```

## Sprint 05.3.1 contact foundation import

Dry-run is the default and changes nothing:

```bash
npm run import:player-contacts -- \
  --file private-imports/adult-team-contacts.csv
```

Apply is available only after the SQL foundation and requires explicit confirmation:

```bash
npm run import:player-contacts -- \
  --file private-imports/adult-team-contacts.csv \
  --apply \
  --confirm IMPORT_CONTACTS
```

Apply writes `player_contacts` and adult-team memberships through one service-role-only transactional RPC. It does **not** create Supabase Auth users.

Generated reports are written to `audit-output/`, use masked phone values, and are ignored by Git.


## Current Production dataset note (2026-08-05)

The database contains 19 players: 18 sporting-active and 1 sporting-inactive due to injury.
The injured player still requires a future account, so the local CSV must contain all 19 rows and use:

```text
verified_by_club=true
can_be_used_for_login=true
create_account=true
player_status=inactive
team_role=player
```

`player_status` describes sporting availability only. The foundation import keeps the adult-team access membership active.
