import fs from "node:fs";
import path from "node:path";
import {
  loadLocalEnv,
  normalizeName,
} from "../sprint-05.3.0/audit-utils.mjs";
import { createAdminClient, formatSupabaseError } from "./admin-client.mjs";

const projectRoot = process.cwd();
loadLocalEnv(projectRoot);

let admin;
try {
  admin = createAdminClient();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
const { client: supabase, keySource, keyType } = admin;

function canonicalPhone(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\+[1-9][0-9]{7,14}$/.test(raw)) return raw;
  if (/^[1-9][0-9]{7,14}$/.test(raw)) return `+${raw}`;
  return raw;
}


console.log(`Admin key: ${keySource} (${keyType})`);

async function listAllAuthUsers() {
  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`auth.users: ${formatSupabaseError(error)}`);
    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < 100) break;
  }
  return users;
}

const [
  { data: teams, error: teamsError },
  { data: roles, error: rolesError },
  { data: players, error: playersError },
  { data: contacts, error: contactsError },
  { data: memberships, error: membershipsError },
  { data: profiles, error: profilesError },
  { data: userRoles, error: userRolesError },
  authUsers,
] = await Promise.all([
  supabase.from("teams").select("id, code, status").eq("code", "adult"),
  supabase.from("roles").select("id, code, scope_type, is_active"),
  supabase.from("players").select("id, full_name, is_active"),
  supabase
    .from("player_contacts")
    .select(
      "id, player_id, phone_e164, account_requested, provisioning_status, provisioned_profile_id, is_active",
    )
    .eq("is_active", true),
  supabase
    .from("team_memberships")
    .select("id, team_id, player_id, profile_id, role_id, status, archived_at"),
  supabase
    .from("profiles")
    .select("id, display_name, phone_e164, account_status, must_change_password"),
  supabase.from("user_roles").select("id, profile_id, role_id, is_active"),
  listAllAuthUsers(),
]);

for (const [label, error] of [
  ["teams", teamsError],
  ["roles", rolesError],
  ["players", playersError],
  ["player_contacts", contactsError],
  ["team_memberships", membershipsError],
  ["profiles", profilesError],
  ["user_roles", userRolesError],
]) {
  if (error) throw new Error(`${label}: ${formatSupabaseError(error)}`);
}

const adultTeam = (teams ?? []).find((team) => team.code === "adult" && team.status === "active");
const playerRole = (roles ?? []).find(
  (role) => role.code === "player" && role.scope_type === "team" && role.is_active,
);
const memberRole = (roles ?? []).find(
  (role) => role.code === "member" && role.scope_type === "global" && role.is_active,
);
const ownerRole = (roles ?? []).find(
  (role) => role.code === "owner" && role.scope_type === "global" && role.is_active,
);

const failures = [];
if (!adultTeam) failures.push("active_adult_team_missing");
if (!playerRole) failures.push("active_player_role_missing");
if (!memberRole) failures.push("active_member_role_missing");
if (!ownerRole) failures.push("active_owner_role_missing");

const playerById = new Map((players ?? []).map((player) => [player.id, player]));
const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
const authById = new Map(authUsers.map((user) => [user.id, user]));

const adultMemberships = adultTeam && playerRole
  ? (memberships ?? []).filter(
      (membership) =>
        membership.team_id === adultTeam.id &&
        membership.role_id === playerRole.id &&
        membership.archived_at === null,
    )
  : [];

const membershipByPlayerId = new Map(
  adultMemberships.map((membership) => [membership.player_id, membership]),
);

const activeContacts = contacts ?? [];
const provisionedContacts = activeContacts.filter(
  (contact) =>
    contact.account_requested &&
    contact.provisioning_status === "provisioned" &&
    contact.provisioned_profile_id,
);
const preparedContacts = activeContacts.filter(
  (contact) => contact.provisioning_status === "prepared",
);
const notRequestedContacts = activeContacts.filter(
  (contact) =>
    !contact.account_requested && contact.provisioning_status === "not_requested",
);

const playerAuthUsers = authUsers.filter(
  (user) => user.app_metadata?.provisioning_source === "sprint-05.3.2",
);
const confirmedPlayerAuthUsers = playerAuthUsers.filter(
  (user) => Boolean(user.phone_confirmed_at),
);
const memberAssignments = memberRole
  ? (userRoles ?? []).filter(
      (assignment) => assignment.role_id === memberRole.id && assignment.is_active,
    )
  : [];
const ownerAssignments = ownerRole
  ? (userRoles ?? []).filter(
      (assignment) => assignment.role_id === ownerRole.id && assignment.is_active,
    )
  : [];

const linkedMemberships = adultMemberships.filter((membership) => membership.profile_id);
const unlinkedMemberships = adultMemberships.filter((membership) => !membership.profile_id);

const summary = {
  generated_at: new Date().toISOString(),
  release: "0.6.0-alpha.3",
  auth_users: authUsers.length,
  player_auth_users: playerAuthUsers.length,
  confirmed_player_auth_users: confirmedPlayerAuthUsers.length,
  profiles: profiles?.length ?? 0,
  active_profiles: (profiles ?? []).filter((profile) => profile.account_status === "active").length,
  players: players?.length ?? 0,
  player_contacts: activeContacts.length,
  contacts_provisioned: provisionedContacts.length,
  contacts_prepared: preparedContacts.length,
  accounts_not_requested: notRequestedContacts.length,
  adult_roster_memberships: adultMemberships.length,
  active_adult_roster_memberships: adultMemberships.filter(
    (membership) => membership.status === "active",
  ).length,
  memberships_with_profile: linkedMemberships.length,
  memberships_without_profile: unlinkedMemberships.length,
  member_role_assignments: memberAssignments.length,
  active_owner_assignments: ownerAssignments.length,
};

const expected = {
  auth_users: 19,
  player_auth_users: 18,
  confirmed_player_auth_users: 18,
  profiles: 19,
  active_profiles: 19,
  players: 19,
  player_contacts: 19,
  contacts_provisioned: 18,
  contacts_prepared: 0,
  accounts_not_requested: 1,
  adult_roster_memberships: 19,
  active_adult_roster_memberships: 19,
  memberships_with_profile: 18,
  memberships_without_profile: 1,
  member_role_assignments: 18,
  active_owner_assignments: 1,
};

for (const [key, expectedValue] of Object.entries(expected)) {
  if (summary[key] !== expectedValue) {
    failures.push(`${key}:received_${summary[key]}_expected_${expectedValue}`);
  }
}

for (const contact of provisionedContacts) {
  const player = playerById.get(contact.player_id);
  const profile = profileById.get(contact.provisioned_profile_id);
  const authUser = authById.get(contact.provisioned_profile_id);
  const membership = membershipByPlayerId.get(contact.player_id);

  if (!player) failures.push(`provisioned_player_missing:${contact.player_id}`);
  if (!profile) failures.push(`provisioned_profile_missing:${contact.provisioned_profile_id}`);
  if (!authUser) failures.push(`provisioned_auth_user_missing:${contact.provisioned_profile_id}`);
  if (canonicalPhone(authUser?.phone) !== contact.phone_e164) {
    failures.push(`auth_phone_contact_phone_mismatch:${contact.player_id}`);
  }
  if (!authUser?.phone_confirmed_at) {
    failures.push(`auth_phone_not_confirmed:${contact.player_id}`);
  }
  if (profile?.account_status !== "active") {
    failures.push(`profile_not_active:${contact.player_id}`);
  }
  if (profile?.must_change_password !== true) {
    failures.push(`must_change_password_not_set:${contact.player_id}`);
  }
  if (membership?.profile_id !== contact.provisioned_profile_id) {
    failures.push(`membership_profile_mismatch:${contact.player_id}`);
  }
  if (membership?.status !== "active") {
    failures.push(`membership_not_active:${contact.player_id}`);
  }
}

const sokurPlayer = (players ?? []).find(
  (player) => normalizeName(player.full_name) === normalizeName("Сокур Дмитро Юрійович"),
);
const sokurContact = sokurPlayer
  ? activeContacts.find((contact) => contact.player_id === sokurPlayer.id)
  : null;
const sokurMembership = sokurPlayer
  ? membershipByPlayerId.get(sokurPlayer.id)
  : null;

if (!sokurPlayer) failures.push("sokur_missing");
if (!sokurContact || sokurContact.account_requested !== false) {
  failures.push("sokur_account_request_expected_false");
}
if (sokurContact?.provisioning_status !== "not_requested") {
  failures.push("sokur_status_expected_not_requested");
}
if (sokurMembership?.profile_id) {
  failures.push("sokur_membership_profile_must_be_null");
}

const eduardPlayer = (players ?? []).find(
  (player) => normalizeName(player.full_name) === normalizeName("Григор’ян Едуард"),
);
const eduardContact = eduardPlayer
  ? activeContacts.find((contact) => contact.player_id === eduardPlayer.id)
  : null;
const eduardMembership = eduardPlayer
  ? membershipByPlayerId.get(eduardPlayer.id)
  : null;

if (!eduardPlayer) failures.push("eduard_missing");
if (eduardPlayer?.is_active !== false) {
  failures.push("eduard_sporting_status_expected_inactive");
}
if (eduardMembership?.status !== "active") {
  failures.push("eduard_membership_expected_active");
}
if (eduardContact?.provisioning_status !== "provisioned") {
  failures.push("eduard_contact_expected_provisioned");
}
if (!eduardContact?.provisioned_profile_id) {
  failures.push("eduard_profile_link_missing");
}

const outputDir = path.join(projectRoot, "audit-output");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "sprint-05.3.2-account-provisioning-verification.json"),
  `${JSON.stringify(
    {
      summary,
      checks: {
        eduard: {
          player_is_active: eduardPlayer?.is_active ?? null,
          membership_status: eduardMembership?.status ?? null,
          provisioning_status: eduardContact?.provisioning_status ?? null,
          profile_linked: Boolean(eduardContact?.provisioned_profile_id),
        },
        sokur: {
          account_requested: sokurContact?.account_requested ?? null,
          provisioning_status: sokurContact?.provisioning_status ?? null,
          membership_profile_is_null: !sokurMembership?.profile_id,
        },
      },
      failures,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log("Sprint 05.3.2 account provisioning verification");
console.table(summary);

if (failures.length) {
  console.error("Verification FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(2);
}

console.log("Verification PASS.");
