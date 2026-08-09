#!/usr/bin/env bash
set -euo pipefail

PROJECT="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
cd "$PROJECT"

echo "=== Sprint 05.3.5 — Safe Git Finalize ==="

test "$(git branch --show-current)" = "sprint/05.3-users-roles-teams"
test "$(node -p "require('./package.json').version")" = "0.6.0-alpha.6"

npm run typecheck
npm run build
npm run verify:player-training-visibility

git add \
  app/player/page.tsx \
  app/player/trainings \
  lib/player/training-visibility.ts \
  scripts/sprint-05.3.5 \
  sql/2026-08-09-sprint-05.3.5-player-training-visibility.sql \
  sql/2026-08-09-sprint-05.3.5-verification.sql \
  sql/2026-08-09-sprint-05.3.5-rollback.sql \
  terminal/Sprint-05.3.5-Copy-SQL.command \
  terminal/Sprint-05.3.5-Copy-Verification.command \
  terminal/Sprint-05.3.5-Rollback.command \
  terminal/Sprint-05.3.5-Safe-Git-Finalize.command \
  qa/Sprint-05.3.5-Player-Training-Visibility-QA-Checklist.md \
  docs/releases/Sprint-05.3.5-Player-Training-Visibility.md \
  package.json \
  package-lock.json

if git diff --cached --name-only | grep -Eq '(^|/)(private-imports|audit-output)/|credentials|\.env|before-sprint'; then
  echo "ERROR: Private or backup file detected in staged changes."
  exit 1
fi

echo
echo "=== FILES TO COMMIT ==="
git diff --cached --name-status

echo
echo "Type COMMIT_05_3_5 to commit and push:"
read -r CONFIRM
test "$CONFIRM" = "COMMIT_05_3_5"

git commit -m "feat(player): add Sprint 05.3.5 training visibility"
git push origin sprint/05.3-users-roles-teams

echo
printf 'PASS: Sprint 05.3.5 committed and pushed.\n'
git --no-pager log -1 --oneline --decorate
git status --short
