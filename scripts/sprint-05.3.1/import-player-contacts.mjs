import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  loadLocalEnv,
  maskPhone,
  normalizeBoolean,
  normalizeName,
  normalizePhone,
  normalizePlayerStatus,
  parseArguments,
  parseCsv,
  writeCsv,
} from "../sprint-05.3.0/audit-utils.mjs";

const projectRoot = process.cwd();
loadLocalEnv(projectRoot);

const args = parseArguments(process.argv.slice(2));
const inputPath = path.resolve(
  projectRoot,
  args.file || "private-imports/adult-team-contacts.csv",
);
const outputDir = path.resolve(projectRoot, args.output || "audit-output");
const apply = args.apply === true;
const confirmation = args.confirm;

if (!fs.existsSync(inputPath)) {
  console.error(`Private import file not found: ${inputPath}`);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(1);
}

if (apply && confirmation !== "IMPORT_CONTACTS") {
  console.error(
    "Apply mode requires: --apply --confirm IMPORT_CONTACTS",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rawRecords = parseCsv(fs.readFileSync(inputPath, "utf8"));
const requiredColumns = [
  "team_code",
  "full_name",
  "phone_e164",
  "verified_by_club",
  "can_be_used_for_login",
  "create_account",
  "player_status",
  "team_role",
];

if (!rawRecords.length) {
  console.error("Private import file contains no data rows.");
  process.exit(1);
}

const missingColumns = requiredColumns.filter(
  (column) => !(column in rawRecords[0]),
);
if (missingColumns.length) {
  console.error(`Missing required columns: ${missingColumns.join(", ")}`);
  process.exit(1);
}

const [{ data: teams, error: teamsError }, { data: roles, error: rolesError }] =
  await Promise.all([
    supabase.from("teams").select("id, code, name, status").eq("code", "adult"),
    supabase
      .from("roles")
      .select("id, code, scope_type, is_active")
      .eq("code", "player")
      .eq("scope_type", "team"),
  ]);

if (teamsError || !teams?.length) {
  console.error(
    `Database foundation is not ready: adult team missing. ${teamsError?.message ?? ""}`,
  );
  process.exit(1);
}
if (rolesError || !roles?.length) {
  console.error(
    `Database foundation is not ready: player team role missing. ${rolesError?.message ?? ""}`,
  );
  process.exit(1);
}

const { data: players, error: playersError } = await supabase
  .from("players")
  .select("id, full_name, display_name, shirt_number, position, is_active")
  .order("full_name");

if (playersError) {
  console.error(`Players query failed: ${playersError.message}`);
  process.exit(1);
}

const byName = new Map(
  (players ?? []).map((player) => [normalizeName(player.full_name), player]),
);
const byShirtNumber = new Map();
for (const player of players ?? []) {
  if (player.shirt_number == null) continue;
  const key = String(player.shirt_number);
  const list = byShirtNumber.get(key) ?? [];
  list.push(player);
  byShirtNumber.set(key, list);
}

const phoneOwners = new Map();
const rows = [];
for (const source of rawRecords.filter((row) => row.full_name || row.phone_e164)) {
  const errors = [];
  const warnings = [];
  const phone = normalizePhone(source.phone_e164);
  const normalizedName = normalizeName(source.full_name);
  const playerStatus = normalizePlayerStatus(source.player_status);
  const verified = normalizeBoolean(source.verified_by_club);
  const loginAllowed = normalizeBoolean(source.can_be_used_for_login);
  const createAccount = normalizeBoolean(source.create_account);

  if (source.team_code !== "adult") errors.push("unsupported_team_code");
  if (source.team_role !== "player") errors.push("unsupported_team_role");
  if (
    source.shirt_number &&
    (!/^\d{1,3}$/.test(source.shirt_number) || Number(source.shirt_number) > 999)
  ) {
    errors.push("invalid_shirt_number");
  }
  if (!phone.valid) errors.push(`invalid_phone:${phone.reason}`);
  if (createAccount && !loginAllowed) {
    errors.push("account_requested_but_login_not_allowed");
  }
  if (loginAllowed && !verified) {
    errors.push("login_phone_not_verified");
  }
  if ((source.phone_owner || "player") !== "player" && loginAllowed) {
    errors.push("non_player_phone_cannot_be_login");
  }

  if (phone.valid) {
    const previous = phoneOwners.get(phone.value);
    if (previous) errors.push(`duplicate_phone_with_row:${previous}`);
    else phoneOwners.set(phone.value, source.__row);
  }

  let matched = byName.get(normalizedName) ?? null;
  let matchMethod = matched ? "exact_full_name" : null;
  if (!matched && source.shirt_number) {
    const candidates = byShirtNumber.get(String(source.shirt_number)) ?? [];
    if (candidates.length === 1) {
      matched = candidates[0];
      matchMethod = "unique_shirt_number_reviewed";
      warnings.push("name_differs_from_database");
    }
  }

  if (!matched) errors.push("player_not_matched");
  if (
    matched &&
    String(matched.shirt_number ?? "") !== String(source.shirt_number ?? "")
  ) {
    errors.push("shirt_number_differs_from_database");
  }
  if (matched && Boolean(matched.is_active) !== (playerStatus === "active")) {
    warnings.push("active_status_differs_from_database");
  }

  rows.push({
    source_row: source.__row,
    player_id: matched?.id ?? null,
    source_full_name: source.full_name,
    database_full_name: matched?.full_name ?? null,
    match_method: matchMethod,
    shirt_number: source.shirt_number || "",
    position: source.position || "",
    phone_e164: phone.valid ? phone.value : source.phone_e164,
    phone_masked: maskPhone(phone.value),
    phone_owner: source.phone_owner || "player",
    owner_name: source.owner_name || "",
    verified_by_club: verified,
    can_be_used_for_login: loginAllowed,
    create_account: createAccount,
    player_status: playerStatus,
    notes: source.notes || "",
    errors,
    warnings,
  });
}

const summary = {
  mode: apply ? "apply" : "dry-run",
  input_file: path.relative(projectRoot, inputPath),
  total_rows: rows.length,
  matched_players: rows.filter((row) => row.player_id).length,
  invalid_rows: rows.filter((row) => row.errors.length).length,
  warning_rows: rows.filter((row) => row.warnings.length).length,
  contacts_to_upsert: rows.filter((row) => !row.errors.length).length,
  accounts_prepared: rows.filter(
    (row) => !row.errors.length && row.create_account,
  ).length,
  accounts_not_requested: rows.filter(
    (row) => !row.errors.length && !row.create_account,
  ).length,
  auth_accounts_created: 0,
};

fs.mkdirSync(outputDir, { recursive: true });
const reportRows = rows.map((row) => ({
  source_row: row.source_row,
  source_full_name: row.source_full_name,
  database_full_name: row.database_full_name,
  shirt_number: row.shirt_number,
  phone_masked: row.phone_masked,
  player_status: row.player_status,
  create_account: row.create_account,
  matched_player_id: row.player_id,
  match_method: row.match_method,
  errors: row.errors.join("|"),
  warnings: row.warnings.join("|"),
}));

writeCsv(
  path.join(outputDir, "sprint-05.3.1-contact-import-report.csv"),
  [
    "source_row",
    "source_full_name",
    "database_full_name",
    "shirt_number",
    "phone_masked",
    "player_status",
    "create_account",
    "matched_player_id",
    "match_method",
    "errors",
    "warnings",
  ],
  reportRows,
);
fs.writeFileSync(
  path.join(outputDir, "sprint-05.3.1-contact-import-summary.json"),
  `${JSON.stringify({ generated_at: new Date().toISOString(), summary, rows: reportRows }, null, 2)}\n`,
  "utf8",
);

console.log("Sprint 05.3.1 player contact foundation import");
console.table(summary);

if (summary.invalid_rows > 0) {
  console.error("Import blocked: resolve every invalid row first.");
  process.exit(2);
}

if (!apply) {
  console.log("Dry-run only. No database rows were changed.");
  console.log(
    "Apply after SQL verification with: npm run import:player-contacts -- --file private-imports/adult-team-contacts.csv --apply --confirm IMPORT_CONTACTS",
  );
  process.exit(0);
}

const payload = rows.map((row) => ({
  player_id: row.player_id,
  phone_e164: row.phone_e164,
  phone_owner: row.phone_owner,
  owner_name: row.owner_name,
  verified_by_club: row.verified_by_club,
  can_be_used_for_login: row.can_be_used_for_login,
  create_account: row.create_account,
  player_status: row.player_status,
  shirt_number: row.shirt_number,
  notes: row.notes,
}));

const { data, error } = await supabase.rpc(
  "apply_player_contact_foundation_import",
  { p_rows: payload },
);

if (error) {
  console.error(`Contact import failed and was rolled back: ${error.message}`);
  process.exit(1);
}

console.log("Contact foundation import applied successfully.");
console.table(data);
console.log("No Supabase Auth accounts were created.");
