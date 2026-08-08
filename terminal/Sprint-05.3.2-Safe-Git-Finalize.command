#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
cd "$PROJECT_DIR"

if [[ "$(git branch --show-current)" != "sprint/05.3-users-roles-teams" ]]; then
  echo "ERROR: Unexpected branch."
  exit 1
fi

npm run typecheck
npm run build
npm run verify:account-provisioning

git restore --staged -- private-imports audit-output 2>/dev/null || true
git add -u

SAFE_LIST="$(mktemp)"
trap 'rm -f "$SAFE_LIST"' EXIT

git ls-files --others --exclude-standard -z | python3 -c '
import sys
for raw in sys.stdin.buffer.read().split(b"\0"):
    if not raw:
        continue
    path = raw.decode("utf-8", "surrogateescape")
    if path.startswith("private-imports/") or path.startswith("audit-output/"):
        continue
    sys.stdout.buffer.write(raw + b"\0")
' > "$SAFE_LIST"

if [[ -s "$SAFE_LIST" ]]; then
  git add --pathspec-from-file="$SAFE_LIST" --pathspec-file-nul
fi

STAGED="$(git diff --cached --name-only)"
if printf '%s\n' "$STAGED" | grep -Eq '^(private-imports|audit-output)/'; then
  echo "ERROR: Private/generated data entered staging."
  exit 1
fi

if printf '%s\n' "$STAGED" | grep -Ei '(^|/)(\.env(\.|$)|.*credentials.*\.csv$|.*contacts.*\.csv$|.*\.dump$|.*\.backup$)' >/dev/null; then
  echo "ERROR: Potentially secret/private file staged."
  exit 1
fi

echo "Files prepared for commit:"
GIT_PAGER=cat git diff --cached --name-status
printf "Type COMMIT_05_3_2 to commit and push: "
IFS= read -r CONFIRMATION
if [[ "$CONFIRMATION" != "COMMIT_05_3_2" ]]; then
  echo "CANCELLED: no commit/push."
  exit 0
fi

git commit -m "feat(auth): complete Sprint 05.3.2 account provisioning"
git push origin "$(git branch --show-current)"

echo "PASS: Sprint 05.3.2 committed and pushed."
GIT_PAGER=cat git log -1 --oneline
GIT_PAGER=cat git status --short
