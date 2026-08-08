import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  loadLocalEnv,
  maskPhone,
  normalizeName,
  parseArguments,
  writeCsv,
} from "../sprint-05.3.0/audit-utils.mjs";
import {
  createAdminClient,
  formatSupabaseError,
  isTransientSupabaseError,
  withTransientRetry,
} from "./admin-client.mjs";

const projectRoot = process.cwd();
loadLocalEnv(projectRoot);

const args = parseArguments(process.argv.slice(2));
const apply = args.apply === true;
const confirmation = args.confirm;
const outputDir = path.resolve(projectRoot, args.output || "audit-output");
const privateOutputDir = path.resolve(
  projectRoot,
  args["private-output"] || "private-imports/generated",
);

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

if (apply && confirmation !== "PROVISION_ACCOUNTS") {
  console.error(
    "Apply mode requires: --apply --confirm PROVISION_ACCOUNTS",
  );
  process.exit(1);
}

async function listAllAuthUsers() {
  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await withTransientRetry(
      async () => {
        const result = await supabase.auth.admin.listUsers({ page, perPage: 100 });
        if (result.error) throw result.error;
        return result;
      },
      { label: `auth.users page ${page}` },
    );
    if (error) throw new Error(`auth.users: ${formatSupabaseError(error)}`);
    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < 100) break;
  }
  return users;
}

async function readFoundationState() {
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
    supabase.from("teams").select("id, code, name, status").eq("code", "adult"),
    supabase
      .from("roles")
      .select("id, code, scope_type, is_active")
      .in("code", ["owner", "member", "player"]),
    supabase
      .from("players")
      .select("id, full_name, display_name, shirt_number, position, is_active")
      .order("full_name"),
    supabase
      .from("player_contacts")
      .select(
        "id, player_id, phone_e164, contact_owner, is_verified_by_club, can_be_used_for_login, account_requested, provisioning_status, provisioned_profile_id, is_active",
      )
      .eq("is_active", true),
    supabase
      .from("team_memberships")
      .select(
        "id, team_id, profile_id, player_id, role_id, status, archived_at",
      ),
    supabase
      .from("profiles")
      .select("id, display_name, phone_e164, account_status, must_change_password"),
    supabase
      .from("user_roles")
      .select("id, profile_id, role_id, is_active"),
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
    if (error) throw new Error(`${label}: ${error.message}`);
  }

  return {
    teams: teams ?? [],
    roles: roles ?? [],
    players: players ?? [],
    contacts: contacts ?? [],
    memberships: memberships ?? [],
    profiles: profiles ?? [],
    userRoles: userRoles ?? [],
    authUsers,
  };
}

function buildAudit(state) {
  const errors = [];
  const warnings = [];

  const adultTeam = state.teams.find(
    (team) => team.code === "adult" && team.status === "active",
  );
  const ownerRole = state.roles.find(
    (role) => role.code === "owner" && role.scope_type === "global" && role.is_active,
  );
  const memberRole = state.roles.find(
    (role) => role.code === "member" && role.scope_type === "global" && role.is_active,
  );
  const playerRole = state.roles.find(
    (role) => role.code === "player" && role.scope_type === "team" && role.is_active,
  );

  if (!adultTeam) errors.push("active_adult_team_missing");
  if (!ownerRole) errors.push("active_owner_role_missing");
  if (!memberRole) errors.push("active_member_role_missing");
  if (!playerRole) errors.push("active_player_role_missing");

  const ownerAssignments = ownerRole
    ? state.userRoles.filter(
        (assignment) => assignment.role_id === ownerRole.id && assignment.is_active,
      )
    : [];
  if (ownerAssignments.length !== 1) {
    errors.push(`active_owner_assignments_expected_1_received_${ownerAssignments.length}`);
  }

  if (state.players.length !== 19) {
    errors.push(`players_expected_19_received_${state.players.length}`);
  }
  if (state.contacts.length !== 19) {
    errors.push(`player_contacts_expected_19_received_${state.contacts.length}`);
  }

  const playerById = new Map(state.players.map((player) => [player.id, player]));
  const authByPhone = new Map(
    state.authUsers
      .filter((user) => user.phone)
      .map((user) => [canonicalPhone(user.phone), user]),
  );

  const rows = [];
  for (const contact of state.contacts) {
    const player = playerById.get(contact.player_id) ?? null;
    const rowErrors = [];
    const rowWarnings = [];

    if (!player) rowErrors.push("player_missing");
    if (contact.contact_owner !== "player" && contact.account_requested) {
      rowErrors.push("account_contact_owner_not_player");
    }
    if (contact.account_requested && !contact.is_verified_by_club) {
      rowErrors.push("account_phone_not_club_verified");
    }
    if (contact.account_requested && !contact.can_be_used_for_login) {
      rowErrors.push("account_phone_login_not_allowed");
    }

    const membership = adultTeam && playerRole
      ? state.memberships.find(
          (item) =>
            item.team_id === adultTeam.id &&
            item.role_id === playerRole.id &&
            item.player_id === contact.player_id &&
            item.archived_at === null,
        ) ?? null
      : null;

    if (!membership) rowErrors.push("adult_player_membership_missing");
    if (membership && membership.status !== "active") {
      rowErrors.push("adult_access_membership_not_active");
    }

    const existingAuthUser = authByPhone.get(contact.phone_e164) ?? null;

    if (
      contact.account_requested &&
      contact.provisioning_status === "prepared" &&
      existingAuthUser
    ) {
      rowErrors.push("prepared_phone_already_exists_in_auth");
    }

    if (
      contact.provisioning_status === "provisioned" &&
      !contact.provisioned_profile_id
    ) {
      rowErrors.push("provisioned_contact_missing_profile_id");
    }

    if (
      contact.provisioned_profile_id &&
      membership?.profile_id !== contact.provisioned_profile_id
    ) {
      rowErrors.push("contact_profile_membership_profile_mismatch");
    }

    if (
      player &&
      normalizeName(player.full_name) === normalizeName("Григор’ян Едуард") &&
      player.is_active !== false
    ) {
      rowErrors.push("eduard_sporting_status_must_be_inactive");
    }

    const action =
      contact.account_requested && contact.provisioning_status === "prepared"
        ? "create"
        : contact.account_requested && contact.provisioning_status === "provisioned"
          ? "already_provisioned"
          : !contact.account_requested && contact.provisioning_status === "not_requested"
            ? "skip_not_requested"
            : "review";

    if (action === "review") rowWarnings.push("unexpected_provisioning_state");

    rows.push({
      player_id: contact.player_id,
      player_name: player?.full_name ?? "(missing player)",
      player_is_active: player?.is_active ?? null,
      phone_e164: contact.phone_e164,
      phone_masked: maskPhone(contact.phone_e164),
      contact_id: contact.id,
      account_requested: contact.account_requested,
      provisioning_status: contact.provisioning_status,
      provisioned_profile_id: contact.provisioned_profile_id,
      membership_id: membership?.id ?? null,
      membership_status: membership?.status ?? null,
      membership_profile_id: membership?.profile_id ?? null,
      existing_auth_user_id: existingAuthUser?.id ?? null,
      action,
      errors: rowErrors,
      warnings: rowWarnings,
    });
  }

  const createRows = rows.filter((row) => row.action === "create");
  const provisionedRows = rows.filter((row) => row.action === "already_provisioned");
  const skippedRows = rows.filter((row) => row.action === "skip_not_requested");
  const reviewRows = rows.filter((row) => row.action === "review");

  const invalidRows = rows.filter((row) => row.errors.length > 0);
  const warningRows = rows.filter((row) => row.warnings.length > 0);

  if (invalidRows.length) errors.push("row_validation_failed");
  if (reviewRows.length) errors.push("unexpected_contact_provisioning_state");

  const sokur = rows.find(
    (row) => normalizeName(row.player_name) === normalizeName("Сокур Дмитро Юрійович"),
  );
  if (!sokur || sokur.action !== "skip_not_requested") {
    errors.push("sokur_must_be_the_only_account_not_requested");
  }

  const eduard = rows.find(
    (row) => normalizeName(row.player_name) === normalizeName("Григор’ян Едуард"),
  );
  if (!eduard) errors.push("eduard_missing");
  if (eduard?.player_is_active !== false) {
    errors.push("eduard_sporting_status_expected_inactive");
  }
  if (eduard?.membership_status !== "active") {
    errors.push("eduard_membership_expected_active");
  }
  if (!eduard?.account_requested) {
    errors.push("eduard_account_must_be_requested");
  }

  const summary = {
    mode: apply ? "apply" : "dry-run",
    release: "0.6.0-alpha.3",
    auth_users_before: state.authUsers.length,
    profiles_before: state.profiles.length,
    players: state.players.length,
    player_contacts: state.contacts.length,
    create_accounts: createRows.length,
    already_provisioned: provisionedRows.length,
    accounts_not_requested: skippedRows.length,
    review_rows: reviewRows.length,
    invalid_rows: invalidRows.length,
    warning_rows: warningRows.length,
    expected_auth_users_after_apply: state.authUsers.length + createRows.length,
  };

  return {
    summary,
    errors,
    warnings,
    rows,
    createRows,
    provisionedRows,
    skippedRows,
    adultTeam,
    ownerRole,
    memberRole,
    playerRole,
  };
}

function publicReport(audit) {
  return {
    generated_at: new Date().toISOString(),
    summary: audit.summary,
    errors: audit.errors,
    warnings: audit.warnings,
    rows: audit.rows.map((row) => ({
      player_id: row.player_id,
      player_name: row.player_name,
      player_is_active: row.player_is_active,
      phone_masked: row.phone_masked,
      account_requested: row.account_requested,
      provisioning_status: row.provisioning_status,
      membership_status: row.membership_status,
      action: row.action,
      errors: row.errors,
      warnings: row.warnings,
    })),
  };
}

function generateTemporaryPassword() {
  return `${crypto.randomBytes(18).toString("base64url")}Aa1!`;
}

function credentialHeaders() {
  return [
    "full_name",
    "phone_e164",
    "temporary_password",
    "auth_user_id",
    "status",
    "created_at",
  ];
}

function writeCredentials(filePath, records) {
  writeCsv(filePath, credentialHeaders(), records);
  fs.chmodSync(filePath, 0o600);
}

fs.mkdirSync(outputDir, { recursive: true });

let state;
let audit;
try {
  state = await withTransientRetry(
    () => readFoundationState(),
    { label: "foundation read" },
  );
  audit = buildAudit(state);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const reportPath = path.join(
  outputDir,
  "sprint-05.3.2-account-provisioning-summary.json",
);
fs.writeFileSync(reportPath, `${JSON.stringify(publicReport(audit), null, 2)}\n`, "utf8");

console.log("Sprint 05.3.2 player account provisioning");
console.log(`Admin key: ${keySource} (${keyType})`);
console.table(audit.summary);

if (audit.errors.length) {
  console.error("Provisioning blocked:");
  for (const error of audit.errors) console.error(`- ${error}`);
  process.exit(2);
}

if (!apply) {
  if (
    audit.summary.create_accounts !== 18 ||
    audit.summary.already_provisioned !== 0 ||
    audit.summary.accounts_not_requested !== 1 ||
    audit.summary.invalid_rows !== 0 ||
    audit.summary.review_rows !== 0
  ) {
    console.error(
      "Dry-run state does not match the approved 18-account pilot baseline.",
    );
    process.exit(2);
  }

  console.log("Dry-run PASS. No Auth users or database links were created.");
  console.log(
    "Apply with: npm run provision:player-accounts -- --apply --confirm PROVISION_ACCOUNTS",
  );
  process.exit(0);
}

if (
  audit.summary.create_accounts !== 18 ||
  audit.summary.already_provisioned !== 0 ||
  audit.summary.accounts_not_requested !== 1
) {
  console.error(
    "Apply mode requires exactly 18 new accounts, 0 already provisioned, and 1 not requested.",
  );
  process.exit(2);
}

fs.mkdirSync(privateOutputDir, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
const credentialsPath = path.join(
  privateOutputDir,
  `sprint-05.3.2-player-credentials-${stamp}.csv`,
);

const credentials = audit.createRows
  .slice()
  .sort((a, b) => a.player_name.localeCompare(b.player_name, "uk-UA"))
  .map((row) => ({
    full_name: row.player_name,
    phone_e164: row.phone_e164,
    temporary_password: generateTemporaryPassword(),
    auth_user_id: "",
    status: "pending",
    created_at: new Date().toISOString(),
  }));

writeCredentials(credentialsPath, credentials);

console.log(`Private credential ledger created: ${credentialsPath}`);
console.log("The file is chmod 600 and must stay under private-imports/.");
console.log("Do not interrupt account creation once it starts.");

const createdUsers = [];
let rollingBack = false;
let databaseFinalized = false;

async function rollbackCreatedUsers(reason) {
  if (rollingBack) return false;
  rollingBack = true;

  console.error(`Rollback started: ${reason}`);
  let rollbackOk = true;

  if (databaseFinalized && createdUsers.length) {
    const { error: prepareRollbackError } = await supabase.rpc(
      "prepare_player_account_deprovisioning_batch",
      { p_profile_ids: createdUsers.map((user) => user.id) },
    );
    if (prepareRollbackError) {
      rollbackOk = false;
      console.error(
        `Database rollback preparation failed: ${prepareRollbackError.message}`,
      );
    } else {
      databaseFinalized = false;
    }
  }

  if (!rollbackOk) {
    for (const record of credentials) {
      if (record.auth_user_id) record.status = "manual_recovery_required";
    }
    writeCredentials(credentialsPath, credentials);
    return false;
  }

  for (const user of [...createdUsers].reverse()) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      rollbackOk = false;
      console.error(`Failed to delete Auth user ${user.id}: ${formatSupabaseError(error)}`);
    }
  }

  for (const record of credentials) {
    if (record.auth_user_id) record.status = rollbackOk ? "rolled_back" : "manual_recovery_required";
  }
  writeCredentials(credentialsPath, credentials);
  return rollbackOk;
}

process.on("SIGINT", () => {
  void rollbackCreatedUsers("SIGINT").finally(() => process.exit(130));
});
process.on("SIGTERM", () => {
  void rollbackCreatedUsers("SIGTERM").finally(() => process.exit(143));
});

try {
  for (const record of credentials) {
    const row = audit.createRows.find((item) => item.player_name === record.full_name);
    if (!row) throw new Error(`Provisioning row disappeared for ${record.full_name}`);

    let createdUser = null;
    let lastCreateError = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const { data, error } = await supabase.auth.admin.createUser({
        phone: record.phone_e164,
        password: record.temporary_password,
        phone_confirm: true,
        user_metadata: {
          full_name: record.full_name,
          name: record.full_name,
          player_id: row.player_id,
          account_type: "player",
          must_change_password: true,
          provisioning_source: "sprint-05.3.2",
        },
        app_metadata: {
          account_type: "player",
          provisioning_source: "sprint-05.3.2",
        },
      });

      if (!error && data?.user) {
        createdUser = data.user;
        break;
      }

      lastCreateError = error ?? new Error("Auth create returned no user");
      const details = formatSupabaseError(lastCreateError);

      if (!isTransientSupabaseError(lastCreateError) || attempt === 5) {
        throw new Error(`Auth create failed for ${record.full_name}: ${details}`);
      }

      // A transient response can happen after Auth already committed the user.
      // Recover idempotently by phone before retrying createUser.
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      const usersAfterError = await listAllAuthUsers();
      const recovered = usersAfterError.find((user) => canonicalPhone(user.phone) === record.phone_e164);
      if (recovered) {
        const expectedPlayerId = String(row.player_id);
        const actualPlayerId = String(recovered.user_metadata?.player_id ?? "");
        if (actualPlayerId !== expectedPlayerId) {
          throw new Error(
            `Auth recovery conflict for ${record.full_name}: phone exists with another player_id`,
          );
        }
        console.warn(
          `Recovered Auth user after transient response: ${record.full_name}`,
        );
        createdUser = recovered;
        break;
      }

      console.warn(
        `Auth create transient failure for ${record.full_name}: ${details}. ` +
          `Retrying ${attempt}/4...`,
      );
    }

    if (!createdUser) {
      throw new Error(
        `Auth create failed for ${record.full_name}: ${formatSupabaseError(lastCreateError)}`,
      );
    }

    createdUsers.push(createdUser);
    record.auth_user_id = createdUser.id;
    record.status = "auth_created";
    writeCredentials(credentialsPath, credentials);
    console.log(`Auth created: ${record.full_name} (${maskPhone(record.phone_e164)})`);
  }

  const finalizeRows = credentials.map((record) => {
    const row = audit.createRows.find((item) => item.player_name === record.full_name);
    return {
      player_id: row.player_id,
      profile_id: record.auth_user_id,
      phone_e164: record.phone_e164,
    };
  });

  const { data: finalizeData, error: finalizeError } = await supabase.rpc(
    "finalize_player_account_provisioning_batch",
    { p_rows: finalizeRows },
  );

  if (finalizeError) {
    throw new Error(`Database finalization failed: ${formatSupabaseError(finalizeError)}`);
  }

  databaseFinalized = true;
  for (const record of credentials) record.status = "provisioned";
  writeCredentials(credentialsPath, credentials);

  fs.writeFileSync(
    path.join(outputDir, "sprint-05.3.2-account-provisioning-apply-result.json"),
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        credentials_file: path.relative(projectRoot, credentialsPath),
        auth_users_created: createdUsers.length,
        finalization: finalizeData,
        phone_values_logged: false,
        passwords_logged: false,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("Account provisioning APPLY PASS.");
  console.log(`Auth users created: ${createdUsers.length}`);
  console.log("Database links finalized atomically.");
  console.log(`Private credentials: ${credentialsPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  const rollbackOk = await rollbackCreatedUsers("apply_failure");
  if (rollbackOk) {
    console.error("Created Auth users were rolled back. Database finalization was not kept.");
    process.exit(2);
  }
  console.error("CRITICAL: automatic rollback was incomplete. Manual recovery is required.");
  console.error(`Use the private ledger: ${credentialsPath}`);
  process.exit(3);
}
