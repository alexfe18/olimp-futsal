#!/usr/bin/env bash
set -euo pipefail

PROJECT="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
EXPECTED_BRANCH="sprint/05.3-users-roles-teams"
EXPECTED_VERSION="0.6.0-alpha.7"

cd "$PROJECT"

echo "=== Sprint 05.3.5.2 — Safe Git Finalize ==="

BRANCH="$(git branch --show-current)"
VERSION="$(node -p "require('./package.json').version")"

if [[ "$BRANCH" != "$EXPECTED_BRANCH" ]]; then
  echo "ERROR: Unexpected branch: $BRANCH"
  exit 1
fi

if [[ "$VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "ERROR: Unexpected version: $VERSION"
  exit 1
fi

export NVM_DIR="$HOME/.nvm"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  source "$NVM_DIR/nvm.sh"
  nvm use
fi

npm run typecheck
npm run build
npm run verify:push-environment-safety

SAFE_PATHS=(
  "app/api/push/send/route.ts"
  "app/api/training-notifications/send/route.ts"
  "lib/server/push-environment.ts"
  "lib/server/push-sender.ts"
  "scripts/sprint-05.3.5.2/verify-push-environment-safety.mjs"
  "docs/releases/Sprint-05.3.5.2-Push-Environment-Safety.md"
  "qa/Sprint-05.3.5.2-Push-Environment-Safety-QA-Checklist.md"
  "terminal/Sprint-05.3.5.2-Push-Safety-Status.command"
  "terminal/Sprint-05.3.5.2-Safe-Git-Finalize.command"
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
printf "Type COMMIT_05_3_5_2 to commit and push: "
IFS= read -r CONFIRMATION

if [[ "$CONFIRMATION" != "COMMIT_05_3_5_2" ]]; then
  echo "CANCELLED: No commit/push was made."
  exit 0
fi

git commit -m "fix(push): add environment delivery safety"
git push origin "$EXPECTED_BRANCH"

echo
echo "PASS: Sprint 05.3.5.2 committed and pushed."
git log -1 --oneline --decorate
echo
echo "Final status:"
git status --short
