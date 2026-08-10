#!/usr/bin/env bash
set -euo pipefail
PROJECT="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
cd "$PROJECT"
pbcopy < sql/2026-08-10-sprint-05.3.6-test-targets.sql
echo "PASS: Safe attendance test-target query copied to clipboard."
echo "Run it in Supabase SQL Editor only when we are ready for controlled test mode."
