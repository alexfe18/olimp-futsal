#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
SQL_FILE="$PROJECT_DIR/sql/2026-08-09-sprint-05.3.3.2-player-access-context-fix.sql"

cd "$PROJECT_DIR"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "ERROR: Hotfix SQL not found: $SQL_FILE"
  exit 1
fi

pbcopy < "$SQL_FILE"

echo
echo "PASS: Sprint 05.3.3.2 hotfix SQL copied to clipboard."
echo "Supabase -> SQL Editor -> New query -> Command+V -> Run"
echo "Expected: Success. No rows returned"
echo
echo "This replaces only get_my_access_context()."
