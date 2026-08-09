#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/Desktop/olimp-release-0.5/olimp-futsal"
BACKUP_ROOT="$HOME/Desktop/olimp-local-backups"
LATEST="$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name 'sprint-05.3.4-*' -print 2>/dev/null | sort | tail -1)"

if [[ -z "$LATEST" || ! -d "$LATEST" ]]; then
  echo "ERROR: No Sprint 05.3.4 backup found under $BACKUP_ROOT"
  exit 1
fi

cd "$PROJECT_DIR"

echo "Restoring from: $LATEST"

if [[ -f "$LATEST/app/player/page.tsx" ]]; then
  mkdir -p app/player
  cp "$LATEST/app/player/page.tsx" app/player/page.tsx
fi

if [[ -f "$LATEST/components/auth/AdminAccessGate.tsx" ]]; then
  mkdir -p components/auth
  cp "$LATEST/components/auth/AdminAccessGate.tsx" components/auth/AdminAccessGate.tsx
fi

if [[ -f "$LATEST/package.json" ]]; then cp "$LATEST/package.json" package.json; fi
if [[ -f "$LATEST/package-lock.json" ]]; then cp "$LATEST/package-lock.json" package-lock.json; fi

rm -f app/player/layout.tsx
rm -f components/auth/PlayerAccessGate.tsx
rm -f lib/auth/access-control.ts
rm -rf scripts/sprint-05.3.4
rm -f docs/releases/Sprint-05.3.4-Player-Session-Access-Guards.md
rm -f qa/Sprint-05.3.4-Player-Session-Access-Guards-QA-Checklist.md
rm -f terminal/Sprint-05.3.4-Rollback.command
rm -f terminal/Sprint-05.3.4-Safe-Git-Finalize.command

echo "PASS: Sprint 05.3.4 local files rolled back."
git status --short
