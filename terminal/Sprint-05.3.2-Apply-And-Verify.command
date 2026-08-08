#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/Desktop/olimp-release-0.5/olimp-futsal"

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  echo "ERROR: Project not found: $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh"
fi
nvm use

if [[ "$(git branch --show-current)" != "sprint/05.3-users-roles-teams" ]]; then
  echo "ERROR: Unexpected branch."
  exit 1
fi
CURRENT_VERSION="$(node -p "require('./package.json').version")"
if [[ "$CURRENT_VERSION" != "0.6.0-alpha.3" ]]; then
  echo "ERROR: Sprint 05.3.2 package is not installed."
  exit 1
fi

if [[ -z "${SUPABASE_SECRET_KEY:-}" && -f .env.local ]]; then
  # The Node script loads .env.local itself; this is only an informational check.
  if grep -q '^SUPABASE_SECRET_KEY=sb_secret_' .env.local; then
    echo "PASS: .env.local contains SUPABASE_SECRET_KEY (new secret key)."
  else
    echo "WARNING: SUPABASE_SECRET_KEY was not found in .env.local."
    echo "The scripts can fall back to SUPABASE_SERVICE_ROLE_KEY, but the new secret key is preferred."
  fi
fi

echo
echo "=== Sprint 05.3.2 — Apply & Verify (Secret-Key Reliability Hotfix) ==="
echo
echo "Running 3 consecutive final dry-runs with the same admin-key resolver used by APPLY..."
for i in 1 2 3; do
  echo
  echo "--- Final dry-run $i/3 ---"
  npm run provision:player-accounts
  if [[ "$i" -lt 3 ]]; then sleep 3; fi
done

echo
echo "This will create 18 real Supabase Auth users and write a private credentials file."
echo "The provisioning script now prefers SUPABASE_SECRET_KEY=sb_secret_..."
echo "Transient Supabase/Auth responses are retried with idempotent phone recovery."
echo "No emails or SMS confirmation messages are sent by the Admin createUser flow."
echo "Do not interrupt the process after confirmation."
printf "Type PROVISION_ACCOUNTS to continue: "
IFS= read -r CONFIRMATION

if [[ "$CONFIRMATION" != "PROVISION_ACCOUNTS" ]]; then
  echo "CANCELLED: No accounts were created."
  exit 0
fi

echo
echo "Creating 18 player accounts..."
npm run provision:player-accounts -- --apply --confirm PROVISION_ACCOUNTS

echo
echo "Running exact account verification..."
npm run verify:account-provisioning

echo
echo "Running Database Foundation regression verification..."
npm run verify:db-foundation

LATEST_CREDENTIALS="$(ls -1t private-imports/generated/sprint-05.3.2-player-credentials-*.csv 2>/dev/null | head -1 || true)"

echo
echo "PASS: Sprint 05.3.2 account provisioning applied and verified."
if [[ -n "$LATEST_CREDENTIALS" ]]; then
  echo "Private credentials ledger:"
  echo "$PROJECT_DIR/$LATEST_CREDENTIALS"
fi
echo "Do not commit, upload or paste the credentials file into chat."
echo "Do not delete it until player onboarding/password-change flow is completed."
