#!/usr/bin/env bash
set -euo pipefail

PROJECT="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
cd "$PROJECT"

echo "=== Sprint 05.3.5.2 — Push Safety Status ==="
echo "Branch: $(git branch --show-current)"
echo "Version: $(node -p "require('./package.json').version")"
echo
echo "Local shell environment:"
echo "PUSH_SEND_MODE=${PUSH_SEND_MODE:-<unset => disabled>}"
echo "PUSH_TEST_PLAYER_ID=${PUSH_TEST_PLAYER_ID:+<configured>}"
echo "VERCEL=${VERCEL:-<unset>}"
echo "VERCEL_ENV=${VERCEL_ENV:-<unset => local>}"
echo
npm run verify:push-environment-safety
