#!/usr/bin/env bash
set -euo pipefail

PROJECT="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
EXPECTED_BRANCH="sprint/05.3-users-roles-teams"
EXPECTED_VERSION="0.6.0-alpha.8"

cd "$PROJECT"

echo "=== Sprint 05.3.6 — Safe Git Finalize ==="

if [[ "$(git branch --show-current)" != "$EXPECTED_BRANCH" ]]; then
  echo "ERROR: Unexpected branch."
  exit 1
fi

if [[ "$(node -p "require('./package.json').version")" != "$EXPECTED_VERSION" ]]; then
  echo "ERROR: Unexpected version."
  exit 1
fi

export NVM_DIR="$HOME/.nvm"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  source "$NVM_DIR/nvm.sh"
  nvm use
fi

npm run typecheck
npm run build
npm run verify:player-attendance

SAFE_PATHS=(
  "app/api/attendance/respond/route.ts"
  "app/player/trainings/[trainingId]/page.tsx"
  "components/Training.tsx"
  "lib/server/attendance-environment.ts"
  "scripts/sprint-05.3.6/verify-player-attendance.mjs"
  "sql/2026-08-10-sprint-05.3.6-player-attendance-integration.sql"
  "sql/2026-08-10-sprint-05.3.6-verification.sql"
  "sql/2026-08-10-sprint-05.3.6-test-targets.sql"
  "sql/2026-08-10-sprint-05.3.6-rollback.sql"
  "docs/releases/Sprint-05.3.6-Player-Attendance-Integration.md"
  "qa/Sprint-05.3.6-Player-Attendance-Integration-QA-Checklist.md"
  "terminal/Sprint-05.3.6-Copy-SQL.command"
  "terminal/Sprint-05.3.6-Copy-Verification.command"
  "terminal/Sprint-05.3.6-Copy-Test-Targets.command"
  "terminal/Sprint-05.3.6-Rollback.command"
  "terminal/Sprint-05.3.6-Safe-Git-Finalize.command"
  "package.json"
  "package-lock.json"
)

git add -- "${SAFE_PATHS[@]}"

echo
echo "=== FILES TO COMMIT ==="
git diff --cached --name-status

if git diff --cached --name-only | grep -Ei '(^|/)(\.env(\.|$)|private-imports|audit-output)' >/dev/null; then
  echo "ERROR: Private/generated data entered staging."
  exit 1
fi

echo
printf "Type COMMIT_05_3_6 to commit and push: "
IFS= read -r CONFIRMATION

if [[ "$CONFIRMATION" != "COMMIT_05_3_6" ]]; then
  echo "CANCELLED: No commit/push was made."
  exit 0
fi

git commit -m "feat(player): add Sprint 05.3.6 attendance integration"
git push origin "$EXPECTED_BRANCH"

echo
echo "PASS: Sprint 05.3.6 committed and pushed."
git log -1 --oneline --decorate
echo
echo "Final status:"
git status --short
