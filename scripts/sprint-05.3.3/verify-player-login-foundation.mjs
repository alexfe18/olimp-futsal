import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const utilsUrl = pathToFileURL(
  path.join(projectRoot, "scripts/sprint-05.3.0/audit-utils.mjs"),
).href;

const { loadLocalEnv } = await import(utilsUrl);
loadLocalEnv(projectRoot);

function describeKey(value) {
  if (!value) return "missing";
  if (value.startsWith("sb_secret_")) return "new_secret_key";
  if (value.split(".").length === 3) return "legacy_jwt_key";
  return "unknown";
}

function formatError(error) {
  if (!error) return "unknown_error";
  const fields = [
    ["message", error.message],
    ["code", error.code],
    ["status", error.status],
    ["name", error.name],
    ["details", error.details],
    ["hint", error.hint],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  return fields.length
    ? fields.map(([key, value]) => `${key}=${String(value)}`).join("; ")
    : String(error);
}

function isTransient(error) {
  const text = formatError(error).toLowerCase();
  const status = Number(error?.status ?? 0);

  return (
    text.includes("jwt issued at future") ||
    text.includes("fetch failed") ||
    text.includes("network") ||
    text.includes("timed out") ||
    text.includes("timeout") ||
    status === 429 ||
    (status >= 500 && status <= 504)
  );
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry(label, operation, attempts = 6) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await operation();
    const error = result?.error ?? null;

    if (!error) return result;

    lastError = error;

    if (!isTransient(error) || attempt === attempts) {
      throw new Error(`${label}: ${formatError(error)}`);
    }

    const delayMs = Math.min(1500 * 2 ** (attempt - 1), 10000);
    console.warn(
      `${label}: transient Supabase response (${formatError(error)}). ` +
        `Retry ${attempt}/${attempts - 1} after ${delayMs}ms...`,
    );
    await sleep(delayMs);
  }

  throw new Error(`${label}: ${formatError(lastError)}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL is missing.");
  process.exit(1);
}

const rawCandidates = [
  ["SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY ?? ""],
  ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""],
].filter(([, value]) => Boolean(value));

const seen = new Set();
const candidates = rawCandidates
  .filter(([, value]) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  })
  .sort((a, b) => {
    const aNew = a[1].startsWith("sb_secret_") ? 1 : 0;
    const bNew = b[1].startsWith("sb_secret_") ? 1 : 0;
    return bNew - aNew;
  });

if (!candidates.length) {
  console.error(
    "ERROR: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.",
  );
  process.exit(1);
}

let selected = null;

for (const [source, key] of candidates) {
  const keyType = describeKey(key);

  if (keyType !== "new_secret_key") {
    console.warn(`Skipping ${source} (${keyType}); a new sb_secret_ key is preferred.`);
    continue;
  }

  const client = createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    await runWithRetry(
      `${source} Data API probe`,
      () => client.from("profiles").select("id", { count: "exact", head: true }),
      6,
    );

    selected = { source, key, keyType, client };
    break;
  } catch (error) {
    console.warn(
      `WARNING: ${source} failed the Data API probe: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

if (!selected) {
  console.error(
    "ERROR: No stable sb_secret_ admin key passed the Data API probe.",
  );
  console.error(
    "Do not change the database. Re-run this verifier later or inspect Supabase Logs.",
  );
  process.exit(1);
}

const { client: supabase, source: keySource, keyType } = selected;

console.log(`Admin key: ${keySource} (${keyType})`);

const authResult = await runWithRetry(
  "auth.users",
  () => supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
);

const profilesResult = await runWithRetry(
  "profiles",
  () => supabase.from("profiles").select(
    "id, account_status, must_change_password",
  ),
);

const membershipsResult = await runWithRetry(
  "team_memberships",
  () => supabase.from("team_memberships").select(
    "profile_id, player_id, status, archived_at",
  ),
);

const authUsers = authResult.data?.users ?? [];
const profiles = profilesResult.data ?? [];
const memberships = membershipsResult.data ?? [];

const activeProfiles = profiles.filter(
  (profile) => profile.account_status === "active",
);

const mustChange = profiles.filter(
  (profile) => profile.must_change_password,
);

const linkedMemberships = memberships.filter(
  (membership) =>
    membership.profile_id &&
    !membership.archived_at &&
    ["active", "inactive"].includes(membership.status),
);

const summary = {
  auth_users: authUsers.length,
  profiles: profiles.length,
  active_profiles: activeProfiles.length,
  must_change_password_profiles: mustChange.length,
  linked_team_memberships: linkedMemberships.length,
};

console.table(summary);

const errors = [];

if (summary.auth_users !== 19) errors.push("auth_users_expected_19");
if (summary.profiles !== 19) errors.push("profiles_expected_19");
if (summary.active_profiles !== 19) errors.push("active_profiles_expected_19");
if (summary.linked_team_memberships !== 18) {
  errors.push("linked_team_memberships_expected_18");
}

if (errors.length) {
  console.error("\nERROR: Sprint 05.3.3 pre-runtime baseline failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("\nPASS: Account/session baseline is ready for Sprint 05.3.3.");
console.log(
  `INFO: ${summary.must_change_password_profiles} profile(s) currently require a password change.`,
);
console.log("No Auth users or database rows were changed.");
