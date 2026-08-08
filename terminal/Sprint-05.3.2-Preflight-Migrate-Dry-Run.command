#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
PRECHECK_SQL="$PROJECT_DIR/sql/2026-08-07-sprint-05.3.2-preflight.sql"
MIGRATION_SQL="$PROJECT_DIR/sql/2026-08-07-sprint-05.3.2-account-provisioning.sql"
BACKUP_DIR="$HOME/Desktop/olimp-db-backups"
TIMESTAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
BACKUP_FILE="$BACKUP_DIR/olimp-futsal-before-sprint-05.3.2-$TIMESTAMP.dump"
PRECHECK_LOG="$PROJECT_DIR/audit-output/sprint-05.3.2-preflight-$TIMESTAMP.txt"

export HOMEBREW_NO_INSTALL_CLEANUP=1
if command -v brew >/dev/null 2>&1 && brew --prefix libpq >/dev/null 2>&1; then
  export PATH="$(brew --prefix libpq)/bin:$PATH"
fi

for cmd in pg_dump pg_restore psql pbpaste python3 shasum; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $cmd"
    exit 1
  fi
done

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  echo "ERROR: Project not found: $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh"
fi
nvm use

CURRENT_BRANCH="$(git branch --show-current)"
CURRENT_VERSION="$(node -p "require('./package.json').version")"

if [[ "$CURRENT_BRANCH" != "sprint/05.3-users-roles-teams" ]]; then
  echo "ERROR: Unexpected branch: $CURRENT_BRANCH"
  exit 1
fi
if [[ "$CURRENT_VERSION" != "0.6.0-alpha.3" ]]; then
  echo "ERROR: Unexpected version: $CURRENT_VERSION"
  exit 1
fi

mkdir -p "$BACKUP_DIR" "$PROJECT_DIR/audit-output"

echo
echo "=== Sprint 05.3.2 — Preflight / Backup / Migration / Dry Run ==="
echo "Branch:  $CURRENT_BRANCH"
echo "Version: $CURRENT_VERSION"
echo

echo "1/5 Verifying Sprint 05.3.1 foundation..."
npm run verify:db-foundation

echo
echo "2/5 Running Account Provisioning dry-run BEFORE migration..."
npm run provision:player-accounts

echo
echo "3/5 Reading Supabase Session pooler URI from clipboard..."
RAW_CLIPBOARD="$(pbpaste)"
DB_URL="$(RAW_CLIPBOARD="$RAW_CLIPBOARD" python3 - <<'PY'
import os, re
value = os.environ.get("RAW_CLIPBOARD", "").strip()
match = re.search(r"postgres(?:ql)?://[^\s\"']+", value, flags=re.I)
print(match.group(0) if match else "")
PY
)"

if [[ -z "$DB_URL" ]]; then
  echo "ERROR: PostgreSQL URI not found in clipboard."
  echo "Copy: Supabase -> Connect -> Direct -> Session pooler -> URI"
  exit 1
fi

if [[ "$DB_URL" == *"YOUR-PASSWORD"* || "$DB_URL" == *"YOUR_PASSWORD"* ]]; then
  printf "Enter Supabase database password: "
  IFS= read -r -s DB_PASSWORD
  echo
  DB_URL="$(DB_URL="$DB_URL" DB_PASSWORD="$DB_PASSWORD" python3 - <<'PY'
import os
from urllib.parse import quote
url = os.environ["DB_URL"]
password = quote(os.environ["DB_PASSWORD"], safe="")
for token in ("[YOUR-PASSWORD]", "[YOUR_PASSWORD]", "<YOUR-PASSWORD>", "<YOUR_PASSWORD>"):
    url = url.replace(token, password)
print(url)
PY
)"
fi

if [[ "$DB_URL" != *"sslmode="* ]]; then
  if [[ "$DB_URL" == *"?"* ]]; then
    DB_URL="${DB_URL}&sslmode=require"
  else
    DB_URL="${DB_URL}?sslmode=require"
  fi
fi

echo
echo "4/5 Creating fresh database backup..."
pg_dump \
  --dbname="$DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE"
pg_restore --list "$BACKUP_FILE" >/dev/null
shasum -a 256 "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
echo "PASS: Backup created and verified: $BACKUP_FILE"

echo
echo "Running read-only SQL preflight..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -X -f "$PRECHECK_SQL" | tee "$PRECHECK_LOG"

echo
echo "Applying Sprint 05.3.2 service-role RPC migration..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -X -f "$MIGRATION_SQL"

echo
echo "5/5 Running Account Provisioning dry-run AFTER migration..."
npm run provision:player-accounts

unset DB_URL
unset DB_PASSWORD 2>/dev/null || true
unset RAW_CLIPBOARD

echo
echo "PASS: Sprint 05.3.2 preflight, backup, migration and dry-run completed."
echo "Expected dry-run baseline: 18 create / 0 provisioned / 1 not requested / 0 invalid."
echo "No player Auth accounts were created."
echo "Do not run apply unless the dry-run above is PASS."
