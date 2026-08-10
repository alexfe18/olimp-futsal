#!/usr/bin/env bash
set -euo pipefail
PROJECT="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
cd "$PROJECT"
pbcopy < sql/2026-08-10-sprint-05.3.6-player-attendance-integration.sql
echo "PASS: Sprint 05.3.6 migration SQL copied to clipboard."
echo "Supabase -> SQL Editor -> New query -> Command+V -> Run"
