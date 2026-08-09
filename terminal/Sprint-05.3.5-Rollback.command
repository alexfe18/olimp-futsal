#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/Desktop/olimp-release-0.5/olimp-futsal"
pbcopy < sql/2026-08-09-sprint-05.3.5-rollback.sql
echo "WARNING: Emergency rollback SQL copied to clipboard."
echo "This restores broad legacy RLS. Do not run unless Sprint 05.3.5 must be rolled back."
