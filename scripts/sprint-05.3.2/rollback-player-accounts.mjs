import fs from "node:fs";
import path from "node:path";
import {
  loadLocalEnv,
  parseArguments,
  parseCsv,
} from "../sprint-05.3.0/audit-utils.mjs";
import { createAdminClient, formatSupabaseError } from "./admin-client.mjs";

const projectRoot = process.cwd();
loadLocalEnv(projectRoot);

const args = parseArguments(process.argv.slice(2));
const fileArg = args.file;
const confirmation = args.confirm;

if (!fileArg) {
  console.error(
    "Rollback requires --file private-imports/generated/sprint-05.3.2-player-credentials-....csv",
  );
  process.exit(1);
}

if (confirmation !== "ROLLBACK_05_3_2") {
  console.error("Rollback requires --confirm ROLLBACK_05_3_2");
  process.exit(1);
}

const credentialsPath = path.resolve(projectRoot, fileArg);
if (!credentialsPath.startsWith(path.join(projectRoot, "private-imports") + path.sep)) {
  console.error("Rollback credentials file must stay under private-imports/.");
  process.exit(1);
}
if (!fs.existsSync(credentialsPath)) {
  console.error(`Credentials file not found: ${credentialsPath}`);
  process.exit(1);
}

let admin;
try {
  admin = createAdminClient();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
const { client: supabase, keySource, keyType } = admin;

console.log(`Admin key: ${keySource} (${keyType})`);

const rows = parseCsv(fs.readFileSync(credentialsPath, "utf8"));
const profileIds = rows
  .filter((row) => row.auth_user_id && row.status === "provisioned")
  .map((row) => row.auth_user_id);

if (profileIds.length !== 18) {
  console.error(
    `Rollback expects 18 provisioned profile ids in the private ledger; received ${profileIds.length}.`,
  );
  process.exit(2);
}


console.log("Preparing database links for rollback...");
const { data, error } = await supabase.rpc(
  "prepare_player_account_deprovisioning_batch",
  { p_profile_ids: profileIds },
);
if (error) {
  console.error(`Database rollback preparation failed: ${formatSupabaseError(error)}`);
  process.exit(2);
}
console.log(data);

let failed = 0;
for (const profileId of [...profileIds].reverse()) {
  const { error: deleteError } = await supabase.auth.admin.deleteUser(profileId);
  if (deleteError) {
    failed += 1;
    console.error(`Auth delete failed for ${profileId}: ${formatSupabaseError(deleteError)}`);
  }
}

if (failed) {
  console.error(`Rollback incomplete: ${failed} Auth users still require manual deletion.`);
  process.exit(3);
}

console.log("Rollback PASS: 18 player Auth users removed and contacts reset to prepared.");
console.log("The Owner account was not touched.");
