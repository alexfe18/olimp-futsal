#!/usr/bin/env bash
set -euo pipefail

SQL_FILE="$HOME/Desktop/olimp-release-0.5/olimp-futsal/sql/2026-08-08-sprint-05.3.3-player-login-first-sign-in.sql"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "ERROR: SQL not found: $SQL_FILE"
  exit 1
fi

pbcopy < "$SQL_FILE"

echo
echo "PASS: Sprint 05.3.3 SQL copied to clipboard."
echo "Supabase -> SQL Editor -> New query -> Command+V -> Run"
echo "Expected: Success. No rows returned"
echo
echo "The migration creates self-context/first-sign-in RPCs only."
echo "It does not create/delete Auth users and does not change passwords."
