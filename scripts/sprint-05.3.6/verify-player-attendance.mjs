import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const checks = [];

function check(name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details });
}

const pkg = JSON.parse(read("package.json"));
const detail = read("app/player/trainings/[trainingId]/page.tsx");
const publicTraining = read("components/Training.tsx");
const api = read("app/api/attendance/respond/route.ts");
const env = read("lib/server/attendance-environment.ts");
const migration = read(
  "sql/2026-08-10-sprint-05.3.6-player-attendance-integration.sql",
);

check("release version", pkg.version === "0.6.0-alpha.8", pkg.version);
check(
  "player training detail has attendance controls",
  detail.includes("Ваша участь") &&
    detail.includes('saveAttendance("yes")') &&
    detail.includes('saveAttendance("no")'),
);
check(
  "player attendance reads through self RPC",
  detail.includes('"get_my_training_attendance"'),
);
check(
  "player attendance writes through safe API",
  detail.includes('fetch("/api/attendance/respond"'),
);
check(
  "public /training writes through safe API",
  publicTraining.includes('fetch("/api/attendance/respond"'),
);
check(
  "public /training no longer directly inserts attendance",
  !publicTraining.includes('.from("training_attendance").insert('),
);
check(
  "public /training no longer directly updates attendance",
  !publicTraining.includes('.from("training_attendance")\n          .update('),
);
check(
  "attendance environment safety exists",
  env.includes("ATTENDANCE_WRITE_MODE") &&
    env.includes("ATTENDANCE_TEST_PLAYER_ID") &&
    env.includes("ATTENDANCE_TEST_TRAINING_ID"),
);
check(
  "live attendance requires Vercel Production",
  env.includes('process.env.VERCEL === "1"') &&
    env.includes('process.env.VERCEL_ENV === "production"'),
);
check(
  "API resolves authenticated player membership",
  api.includes('"team_memberships"') &&
    api.includes("authenticatedProfileId"),
);
check(
  "API logs suppressed local writes",
  api.includes("[attendance] SUPPRESSED"),
);
check(
  "migration removes direct public writes",
  migration.includes('drop policy if exists "Public can add attendance"') &&
    migration.includes('drop policy if exists "Public can update attendance"'),
);
check(
  "migration preserves staff attendance writes",
  migration.includes('"05.3.6 staff attendance insert"') &&
    migration.includes('"05.3.6 staff attendance update"'),
);
check(
  "service RPC preserves coach fields by omission",
  migration.includes("on conflict (training_id, player_id)") &&
    !migration.includes("actual_status = excluded.actual_status") &&
    !migration.includes("coach_note = excluded.coach_note"),
);
check(
  "verification npm script exists",
  pkg.scripts?.["verify:player-attendance"] ===
    "node scripts/sprint-05.3.6/verify-player-attendance.mjs",
);

console.log("Sprint 05.3.6 Player Attendance Integration verification");
console.table(checks);

const failed = checks.filter((item) => !item.ok);

if (failed.length) {
  console.error(`Verification FAILED: ${failed.length} check(s).`);
  process.exit(1);
}

console.log("Verification PASS.");
console.log("No database rows were changed by this verification.");
