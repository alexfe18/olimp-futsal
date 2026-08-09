#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
EXPECTED_BRANCH="sprint/05.3-users-roles-teams"
EXPECTED_VERSION="0.6.0-alpha.5"

cd "$PROJECT_DIR"

if [[ "$(git branch --show-current)" != "$EXPECTED_BRANCH" ]]; then
  echo "ERROR: Wrong branch."
  exit 1
fi

if [[ "$(node -p "require('./package.json').version")" != "$EXPECTED_VERSION" ]]; then
  echo "ERROR: Wrong version."
  exit 1
fi

npm run typecheck
npm run build
npm run verify:player-access-guards

git add \
  app/player/layout.tsx \
  app/player/page.tsx \
  components/auth/AdminAccessGate.tsx \
  components/auth/PlayerAccessGate.tsx \
  lib/auth/access-control.ts \
  scripts/sprint-05.3.4/verify-player-access-guards.mjs \
  docs/releases/Sprint-05.3.4-Player-Session-Access-Guards.md \
  qa/Sprint-05.3.4-Player-Session-Access-Guards-QA-Checklist.md \
  terminal/Sprint-05.3.4-Rollback.command \
  terminal/Sprint-05.3.4-Safe-Git-Finalize.command \
  package.json \
  package-lock.json

if git diff --cached --name-only | grep -Eq '(^|/)(private-imports|audit-output)/|credentials|\.env|before-sprint|olimp-local-backups'; then
  echo "ERROR: Private or backup file detected in staged changes."
  echo "Nothing was committed."
  exit 1
fi

git diff --cached --check

echo
echo "=== FILES TO COMMIT ==="
git diff --cached --name-status

echo
echo "Type COMMIT_05_3_4 to commit and push:"
read -r CONFIRM
if [[ "$CONFIRM" != "COMMIT_05_3_4" ]]; then
  echo "Cancelled. Nothing was committed."
  exit 1
fi

git commit -m "feat(auth): complete Sprint 05.3.4 player session guards"
git push origin "$EXPECTED_BRANCH"

echo
echo "PASS: Sprint 05.3.4 committed and pushed."
git --no-pager log -1 --oneline --decorate
git status --short
