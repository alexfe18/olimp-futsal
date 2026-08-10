#!/usr/bin/env bash
set -euo pipefail
PROJECT="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
cd "$PROJECT"
pbcopy < sql/2026-08-10-sprint-05.3.6-verification.sql
echo "PASS: Sprint 05.3.6 verification SQL copied to clipboard."
