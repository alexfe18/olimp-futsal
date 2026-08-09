import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const pkg = JSON.parse(read("package.json"));

const checks = [
  ["release version", pkg.version === "0.6.0-alpha.6", pkg.version],
  ["player trainings route exists", exists("app/player/trainings/page.tsx"), ""],
  ["player training details route exists", exists("app/player/trainings/[trainingId]/page.tsx"), ""],
  ["training visibility helper exists", exists("lib/player/training-visibility.ts"), ""],
  [
    "player home links to protected trainings route",
    read("app/player/page.tsx").includes('href="/player/trainings"'),
    "",
  ],
  [
    "list explicitly scopes by team_id",
    read("lib/player/training-visibility.ts").includes('.eq("team_id", teamId)'),
    "",
  ],
  [
    "list explicitly requires active training",
    read("lib/player/training-visibility.ts").includes('.eq("is_active", true)'),
    "",
  ],
  [
    "list explicitly requires scheduled status",
    read("lib/player/training-visibility.ts").includes('.eq("status", "scheduled")'),
    "",
  ],
  [
    "player UI does not query training_plans",
    !read("lib/player/training-visibility.ts").includes('from("training_plans")'),
    "",
  ],
  [
    "RLS migration removes broad public training read",
    read("sql/2026-08-09-sprint-05.3.5-player-training-visibility.sql").includes(
      'drop policy if exists "Public can read trainings"',
    ),
    "",
  ],
  [
    "RLS migration removes broad public plan policies",
    read("sql/2026-08-09-sprint-05.3.5-player-training-visibility.sql").includes(
      'drop policy if exists "Allow public read training plans"',
    ),
    "",
  ],
  [
    "rollback exists",
    exists("sql/2026-08-09-sprint-05.3.5-rollback.sql"),
    "",
  ],
];

console.log("Sprint 05.3.5 Player Training Visibility verification\n");
console.table(checks.map(([name, ok, details]) => ({ name, ok, details })));

const failed = checks.filter(([, ok]) => !ok);
if (failed.length > 0) {
  console.error(`\nVerification FAILED: ${failed.length} check(s).`);
  process.exit(1);
}

console.log("\nVerification PASS.");
console.log("No database rows were changed by this verification.");
