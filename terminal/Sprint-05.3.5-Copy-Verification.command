#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/Desktop/olimp-release-0.5/olimp-futsal"
pbcopy < sql/2026-08-09-sprint-05.3.5-verification.sql
echo "PASS: Sprint 05.3.5 verification SQL copied to clipboard."
echo "Supabase -> SQL Editor -> New query -> Command+V -> Run"
