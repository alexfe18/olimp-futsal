import fs from "node:fs";

const checks = [];
const failed = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(name, condition) {
  checks.push({ name, pass: Boolean(condition) });
  if (!condition) failed.push(name);
}

const training = read("components/Training.tsx");
const route = read("app/api/attendance/respond/route.ts");
const profile = read("app/player/profile/page.tsx");
const dashboard = read("app/player/page.tsx");
const migration = read(
  "sql/2026-08-12-sprint-05.3.6.2-b6.4-protected-training-board.sql",
);
const pkg = JSON.parse(read("package.json"));

check("version_alpha_15", pkg.version === "0.6.0-alpha.15");
check(
  "training_uses_protected_board_rpc",
  training.includes('supabase.rpc("get_training_attendance_board"'),
);
check(
  "training_no_direct_attendance_select",
  !training.includes('.from("training_attendance")'),
);
check(
  "anonymous_gate_present",
  training.includes("Ви гравець Олімп Футзал?") &&
    training.includes("Відповісти на тренування"),
);
check(
  "authenticated_board_names_present",
  training.includes("Team Attendance Board") &&
    training.includes("Імена бачать лише учасники команди"),
);
check(
  "login_return_key_present",
  training.includes("olimp-player-login-return-to") &&
    dashboard.includes("olimp-player-login-return-to"),
);
check(
  "api_requires_authorization",
  route.includes("if (!accessToken)") && route.includes("login_required: true"),
);
check(
  "api_uses_authenticated_rpc_only",
  route.includes('admin.rpc("respond_to_player_training"') &&
    !route.includes('admin.rpc("respond_to_training_public"'),
);
check(
  "profile_team_status_label",
  profile.includes("Статус у команді") && !profile.includes(">Членство</dt>"),
);
check(
  "migration_removes_public_read",
  migration.includes('drop policy if exists "Public can read attendance"'),
);
check(
  "migration_revokes_anon_table_access",
  migration.includes("revoke all on table public.training_attendance from anon"),
);
check(
  "migration_hides_public_write_rpcs",
  migration.includes(
    "revoke all on function public.respond_to_training_public(uuid, uuid, text) from anon",
  ) &&
    migration.includes(
      "grant execute on function public.respond_to_training_public(uuid, uuid, text) to service_role",
    ),
);

console.log(
  JSON.stringify(
    {
      verification: "Sprint 05.3.6.2 B.6.4 Protected Training Board",
      pass: failed.length === 0,
      failed,
      checks: Object.fromEntries(checks.map((item) => [item.name, item.pass])),
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exit(1);
}
