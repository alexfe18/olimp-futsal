#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
SQL_FILE="$PROJECT_DIR/sql/2026-08-09-sprint-05.3.3.2-verification.sql"

cd "$PROJECT_DIR"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "ERROR: Verification SQL not found: $SQL_FILE"
  exit 1
fi

pbcopy < "$SQL_FILE"

echo
echo "PASS: Sprint 05.3.3.2 verification SQL copied to clipboard."
echo "Supabase -> SQL Editor -> New query -> Command+V -> Run"
echo "READ-ONLY transaction; ends with ROLLBACK."
