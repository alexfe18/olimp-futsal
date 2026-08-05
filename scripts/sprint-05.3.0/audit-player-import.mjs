import fs from "node:fs";
import path from "node:path";
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
} from "./audit-utils.mjs";

const projectRoot = process.cwd();
loadLocalEnv(projectRoot);
const args = parseArguments(process.argv.slice(2));
const inputPath = path.resolve(projectRoot, args.file || "private-imports/adult-team-contacts.csv");
const outputDir = path.resolve(projectRoot, args.output || "audit-output");

if (!fs.existsSync(inputPath)) {
  console.error(`Import file not found: ${inputPath}`);
  process.exit(1);
}

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

const rawRecords = parseCsv(fs.readFileSync(inputPath, "utf8"));
if (!rawRecords.length) {
  console.error("Import file contains no data rows.");
  process.exit(1);
}

const missingColumns = requiredColumns.filter((column) => !(column in rawRecords[0]));
if (missingColumns.length) {
  console.error(`Missing required columns: ${missingColumns.join(", ")}`);
  process.exit(1);
}

const phoneOwners = new Map();
const normalizedNames = new Map();
const validation = rawRecords
  .filter((row) => row.full_name || row.phone_e164)
  .map((row) => {
    const phone = normalizePhone(row.phone_e164);
    const normalizedName = normalizeName(row.full_name);
    const errors = [];
    const warnings = [];

    if (!row.full_name) errors.push("missing_full_name");
    if (!phone.valid) errors.push(`invalid_phone:${phone.reason}`);
    if (!normalizeBoolean(row.verified_by_club)) warnings.push("phone_not_club_verified");
    if (normalizeBoolean(row.create_account) && !normalizeBoolean(row.can_be_used_for_login)) {
      errors.push("account_requested_but_login_not_allowed");
    }

    if (phone.valid) {
      const previous = phoneOwners.get(phone.value);
      if (previous) errors.push(`duplicate_phone_with_row:${previous}`);
      else phoneOwners.set(phone.value, row.__row);
    }

    if (normalizedName) {
      const previous = normalizedNames.get(normalizedName);
      if (previous) errors.push(`duplicate_name_with_row:${previous}`);
      else normalizedNames.set(normalizedName, row.__row);
    }

    return {
      source_row: row.__row,
      team_code: row.team_code || "adult",
      full_name: row.full_name,
      display_name: row.display_name || "",
      shirt_number: row.shirt_number || "",
      position: row.position || "",
      phone_e164: phone.valid ? phone.value : row.phone_e164,
      phone_masked: maskPhone(phone.value),
      phone_owner: row.phone_owner || "player",
      owner_name: row.owner_name || "",
      verified_by_club: normalizeBoolean(row.verified_by_club),
      can_be_used_for_login: normalizeBoolean(row.can_be_used_for_login),
      create_account: normalizeBoolean(row.create_account),
      player_status: normalizePlayerStatus(row.player_status),
      team_role: row.team_role || "player",
      notes: row.notes || "",
      matched_player_id: null,
      match_method: null,
      database_full_name: null,
      errors,
      warnings,
    };
  });

let dbComparison = "skipped";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && serviceRoleKey) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("players")
    .select("id, full_name, display_name, shirt_number, position, is_active")
    .order("full_name");

  if (error) {
    console.error(`Players DB comparison failed: ${error.message}`);
    dbComparison = `failed:${error.message}`;
  } else {
    dbComparison = "completed";
    const players = data ?? [];
    const byName = new Map(players.map((player) => [normalizeName(player.full_name), player]));
    const byShirtNumber = new Map();
    for (const player of players) {
      if (player.shirt_number == null) continue;
      const key = String(player.shirt_number);
      const list = byShirtNumber.get(key) ?? [];
      list.push(player);
      byShirtNumber.set(key, list);
    }

    for (const item of validation) {
      const exact = byName.get(normalizeName(item.full_name));
      if (exact) {
        item.matched_player_id = exact.id;
        item.match_method = "exact_full_name";
        item.database_full_name = exact.full_name;
        if (String(exact.shirt_number ?? "") !== String(item.shirt_number ?? "")) {
          item.warnings.push("shirt_number_differs_from_database");
        }
        if (Boolean(exact.is_active) !== (item.player_status === "active")) {
          item.warnings.push("active_status_differs_from_database");
        }
        continue;
      }

      const shirtCandidates = byShirtNumber.get(String(item.shirt_number)) ?? [];
      if (item.shirt_number && shirtCandidates.length === 1) {
        const candidate = shirtCandidates[0];
        item.matched_player_id = candidate.id;
        item.match_method = "unique_shirt_number_review_required";
        item.database_full_name = candidate.full_name;
        item.warnings.push("name_differs_from_database");
      } else {
        item.errors.push("player_not_matched");
      }
    }
  }
}

const summary = {
  generated_at: new Date().toISOString(),
  input_file: path.relative(projectRoot, inputPath),
  db_comparison: dbComparison,
  total_rows: validation.length,
  active_players: validation.filter((item) => item.player_status === "active").length,
  inactive_players: validation.filter((item) => item.player_status === "inactive").length,
  accounts_requested: validation.filter((item) => item.create_account).length,
  accounts_not_requested: validation.filter((item) => !item.create_account).length,
  invalid_rows: validation.filter((item) => item.errors.length).length,
  warning_rows: validation.filter((item) => item.warnings.length).length,
  matched_players: validation.filter((item) => item.matched_player_id).length,
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "sprint-05.3.0-player-import-report.json"),
  `${JSON.stringify({ summary, rows: validation }, null, 2)}\n`,
  "utf8",
);

writeCsv(
  path.join(outputDir, "sprint-05.3.0-player-import-report.csv"),
  [
    "source_row",
    "full_name",
    "shirt_number",
    "position",
    "phone_masked",
    "player_status",
    "create_account",
    "matched_player_id",
    "match_method",
    "database_full_name",
    "errors",
    "warnings",
  ],
  validation.map((item) => ({
    ...item,
    errors: item.errors.join("|"),
    warnings: item.warnings.join("|"),
  })),
);

console.log("Sprint 05.3.0 player import audit");
console.table(summary);
console.log(`Reports: ${path.relative(projectRoot, outputDir)}`);

if (summary.invalid_rows > 0) process.exitCode = 2;
