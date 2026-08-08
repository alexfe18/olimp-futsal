#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/Desktop/olimp-release-0.5/olimp-futsal"

echo
echo "=== Sprint 05.3.2.3 — Single Auth Confirmation Test + Rollback ==="
echo "Creates ONE temporary user, verifies confirmation/profile sync, then deletes it."
echo "No player_contacts or team_memberships rows are modified."
echo

cd "$PROJECT_DIR"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh"
fi
nvm use >/dev/null

node --input-type=module <<'NODE'
import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const utilsUrl = pathToFileURL(
  path.join(projectRoot, "scripts/sprint-05.3.0/audit-utils.mjs"),
).href;
const { loadLocalEnv } = await import(utilsUrl);
loadLocalEnv(projectRoot);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

if (!url || !key || !key.startsWith("sb_secret_")) {
  console.error("ERROR: New sb_secret_ admin key is required.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: authBeforeResult, error: authBeforeError } =
  await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authBeforeError) throw authBeforeError;

const authBefore = authBeforeResult.users.length;

const { count: profilesBefore, error: profilesBeforeError } = await supabase
  .from("profiles")
  .select("id", { count: "exact", head: true });
if (profilesBeforeError) throw profilesBeforeError;

const { data: contacts, error: contactsError } = await supabase
  .from("player_contacts")
  .select("player_id, phone_e164")
  .eq("account_requested", true)
  .eq("provisioning_status", "prepared")
  .is("provisioned_profile_id", null)
  .order("player_id");
if (contactsError) throw contactsError;

if ((contacts ?? []).length !== 18) {
  throw new Error(`Expected 18 prepared contacts, received ${(contacts ?? []).length}`);
}

const candidate = contacts[0];

const { data: player, error: playerError } = await supabase
  .from("players")
  .select("id, full_name")
  .eq("id", candidate.player_id)
  .single();
if (playerError) throw playerError;

const existingSamePhone = authBeforeResult.users.find(
  (user) => user.phone === candidate.phone_e164,
);
if (existingSamePhone) {
  throw new Error("Selected test phone already exists in Auth.");
}

console.log(`Auth users before: ${authBefore}`);
console.log(`Profiles before:   ${profilesBefore ?? 0}`);
console.log(`Prepared accounts: ${contacts.length}`);
console.log(`Test player:       ${player.full_name}`);
console.log("Phone:             [redacted]");

let createdUserId = null;
let passed = false;

async function rollback() {
  if (!createdUserId) return;

  console.log();
  console.log("Rollback: deleting temporary Auth user...");
  const { error } = await supabase.auth.admin.deleteUser(createdUserId);
  if (error) {
    console.error(`CRITICAL: Auth rollback failed: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  for (let i = 0; i < 10; i += 1) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", createdUserId)
      .maybeSingle();

    if (profileError) {
      console.error(`CRITICAL: Profile cleanup check failed: ${profileError.message}`);
      process.exitCode = 2;
      return;
    }
    if (!profile) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const { data: authAfterResult, error: authAfterError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authAfterError) {
    console.error(`CRITICAL: Auth rollback verification failed: ${authAfterError.message}`);
    process.exitCode = 2;
    return;
  }

  const { count: profilesAfter, error: profilesAfterError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (profilesAfterError) {
    console.error(`CRITICAL: Profile count verification failed: ${profilesAfterError.message}`);
    process.exitCode = 2;
    return;
  }

  if (authAfterResult.users.length !== authBefore) {
    console.error(`CRITICAL: Auth count=${authAfterResult.users.length}, expected=${authBefore}`);
    process.exitCode = 2;
    return;
  }

  if ((profilesAfter ?? 0) !== (profilesBefore ?? 0)) {
    console.error(`CRITICAL: Profiles count=${profilesAfter}, expected=${profilesBefore ?? 0}`);
    process.exitCode = 2;
    return;
  }

  console.log("PASS: Temporary Auth user removed.");
  console.log("PASS: Profile rollback verified.");
}

try {
  console.log();
  console.log("Creating ONE temporary Auth user...");

  const password = `Tmp-${crypto.randomBytes(18).toString("base64url")}aA1!`;

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      phone: candidate.phone_e164,
      password,
      phone_confirm: true,
      user_metadata: {
        full_name: player.full_name,
        must_change_password: true,
        sprint_test: "05.3.2.3-confirmation-sync",
      },
    });

  if (createError || !created?.user) {
    throw new Error(
      `createUser failed: ${createError?.message ?? "unknown"} ` +
      `(status=${createError?.status ?? "n/a"}, code=${createError?.code ?? "n/a"})`,
    );
  }

  createdUserId = created.user.id;

  let authUser = null;
  let profile = null;

  for (let i = 0; i < 12; i += 1) {
    const { data: authLookup, error: authLookupError } =
      await supabase.auth.admin.getUserById(createdUserId);
    if (authLookupError) throw authLookupError;
    authUser = authLookup.user;

    const { data: profileLookup, error: profileLookupError } = await supabase
      .from("profiles")
      .select("id, phone_e164, account_status, must_change_password")
      .eq("id", createdUserId)
      .single();
    if (profileLookupError) throw profileLookupError;
    profile = profileLookup;

    if (
      authUser?.phone_confirmed_at &&
      profile?.account_status === "active"
    ) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const failures = [];

  if (!authUser?.phone_confirmed_at) {
    failures.push("Auth phone_confirmed_at is null");
  }
  if (profile?.phone_e164 !== candidate.phone_e164) {
    failures.push("profile phone_e164 mismatch");
  }
  if (profile?.account_status !== "active") {
    failures.push(`profile account_status=${profile?.account_status}, expected active`);
  }
  if (profile?.must_change_password !== true) {
    failures.push("profile must_change_password is not true");
  }

  if (failures.length) {
    throw new Error(failures.join("; "));
  }

  console.log();
  console.log("PASS: Auth createUser succeeded.");
  console.log("PASS: Auth phone is confirmed.");
  console.log("PASS: Profile phone_e164 is valid.");
  console.log("PASS: Profile account_status synchronized to active.");
  console.log("PASS: must_change_password = true.");

  passed = true;
} catch (error) {
  console.error();
  console.error(`TEST FAILED: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await rollback();
}

if (!passed || process.exitCode === 2) {
  process.exit(process.exitCode === 2 ? 2 : 1);
}

console.log();
console.log("=== SINGLE AUTH CONFIRMATION TEST PASS ===");
console.log("No player account was kept.");
console.log("Safe to proceed to full provisioning after review.");
NODE
