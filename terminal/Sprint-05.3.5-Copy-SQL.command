#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/Desktop/olimp-release-0.5/olimp-futsal"
pbcopy < sql/2026-08-09-sprint-05.3.5-player-training-visibility.sql
echo "PASS: Sprint 05.3.5 migration SQL copied to clipboard."
echo "Supabase -> SQL Editor -> New query -> Command+V -> Run"
