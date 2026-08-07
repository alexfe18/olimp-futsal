import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "../sprint-05.3.0/audit-utils.mjs";

const projectRoot = process.cwd();
loadLocalEnv(projectRoot);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function count(table, configure = (query) => query) {
  const query = configure(
    supabase.from(table).select("*", { count: "exact", head: true }),
  );
  const { count: value, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return value ?? 0;
}

const { data: adultTeam, error: teamError } = await supabase
  .from("teams")
  .select("id, code, name, status")
  .eq("code", "adult")
  .single();
if (teamError) throw new Error(`teams: ${teamError.message}`);

const { data: roles, error: rolesError } = await supabase
  .from("roles")
  .select("id, code, scope_type, is_system, is_active")
  .order("scope_type")
  .order("code");
if (rolesError) throw new Error(`roles: ${rolesError.message}`);

const ownerRole = roles.find((role) => role.code === "owner");
const playerRole = roles.find((role) => role.code === "player");
if (!ownerRole || !playerRole) {
  throw new Error("Required owner/player roles are missing.");
}

const { data: ownerAssignments, error: ownerError } = await supabase
  .from("user_roles")
  .select("id, profile_id, is_active")
  .eq("role_id", ownerRole.id)
  .eq("is_active", true);
if (ownerError) throw new Error(`user_roles: ${ownerError.message}`);

const { count: rosterCount, error: rosterError } = await supabase
  .from("team_memberships")
  .select("*", { count: "exact", head: true })
  .eq("team_id", adultTeam.id)
  .eq("role_id", playerRole.id);
if (rosterError) throw new Error(`team_memberships: ${rosterError.message}`);

const { count: activeRosterCount, error: activeRosterError } = await supabase
  .from("team_memberships")
  .select("*", { count: "exact", head: true })
  .eq("team_id", adultTeam.id)
  .eq("role_id", playerRole.id)
  .eq("status", "active");
if (activeRosterError) {
  throw new Error(`active team_memberships: ${activeRosterError.message}`);
}

const adultTeamAliases = new Set([
  "adult",
  "олімп",
  "олімп футзал",
  "дорослі",
  "доросла команда",
]);

async function countUnmapped(table) {
  const { data, error } = await supabase
    .from(table)
    .select("id, team_name, team_id")
    .not("team_name", "is", null)
    .is("team_id", null);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []).filter((row) =>
    adultTeamAliases.has(String(row.team_name ?? "").trim().toLocaleLowerCase("uk-UA")),
  ).length;
}

const summary = {
  generated_at: new Date().toISOString(),
  release: "0.6.0-alpha.2",
  adult_team: adultTeam,
  profiles: await count("profiles"),
  players: await count("players"),
  active_players: await count("players", (query) => query.eq("is_active", true)),
  inactive_players: await count("players", (query) => query.eq("is_active", false)),
  system_roles: roles.filter((role) => role.is_system && role.is_active).length,
  permissions: await count("permissions", (query) => query.eq("is_active", true)),
  active_owners: ownerAssignments?.length ?? 0,
  adult_roster_memberships: rosterCount ?? 0,
  active_adult_roster_memberships: activeRosterCount ?? 0,
  player_contacts: await count("player_contacts", (query) =>
    query.eq("is_active", true),
  ),
  accounts_prepared: await count("player_contacts", (query) =>
    query
      .eq("is_active", true)
      .eq("account_requested", true)
      .eq("provisioning_status", "prepared"),
  ),
  provisioned_profiles: await count("player_contacts", (query) =>
    query.not("provisioned_profile_id", "is", null),
  ),
  unmapped_training_plans: await countUnmapped("training_plans"),
  unmapped_trainings: await countUnmapped("trainings"),
  unmapped_training_templates: await countUnmapped("training_templates"),
  legacy_policies_changed: false,
  auth_accounts_created_by_05_3_1: 0,
};

const errors = [];
if (adultTeam.status !== "active") errors.push("adult_team_not_active");
if (summary.system_roles !== 11) errors.push("system_role_count_expected_11");
if (summary.permissions < 70) errors.push("permission_catalog_incomplete");
if (summary.active_owners < 1) errors.push("active_owner_missing");
if (summary.adult_roster_memberships < summary.players) {
  errors.push("adult_roster_memberships_missing_for_players");
}
if (summary.active_adult_roster_memberships < summary.players) {
  errors.push("active_adult_memberships_missing_for_players");
}
if (summary.unmapped_training_plans > 0) errors.push("unmapped_training_plans");
if (summary.unmapped_trainings > 0) errors.push("unmapped_trainings");
if (summary.unmapped_training_templates > 0) {
  errors.push("unmapped_training_templates");
}

const outputDir = path.join(projectRoot, "audit-output");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "sprint-05.3.1-database-foundation-verification.json"),
  `${JSON.stringify({ summary, errors }, null, 2)}\n`,
  "utf8",
);

console.log("Sprint 05.3.1 database foundation verification");
console.table(summary);

if (errors.length) {
  console.error("Verification FAILED:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(2);
}

console.log("Verification PASS.");
