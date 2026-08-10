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
const env = read("lib/server/push-environment.ts");
const sender = read("lib/server/push-sender.ts");
const trainingRoute = read("app/api/training-notifications/send/route.ts");
const generalRoute = read("app/api/push/send/route.ts");

check(
  "release version",
  pkg.version === "0.6.0-alpha.7",
  pkg.version,
);
check(
  "PUSH_SEND_MODE safety exists",
  env.includes("PUSH_SEND_MODE") &&
    env.includes('"disabled"') &&
    env.includes('"test"') &&
    env.includes('"live"'),
);
check(
  "live delivery requires Vercel Production",
  env.includes('process.env.VERCEL === "1"') &&
    env.includes('process.env.VERCEL_ENV === "production"'),
);
check(
  "test delivery requires one configured player",
  env.includes("PUSH_TEST_PLAYER_ID") &&
    env.includes("test_player_not_configured"),
);
check(
  "sender suppresses blocked environments before loading subscriptions",
  sender.indexOf('if (!delivery.allowed)') <
    sender.indexOf('process.env.NEXT_PUBLIC_SUPABASE_URL'),
);
check(
  "test mode targets configured player only",
  sender.includes('delivery.configuredMode === "test"') &&
    sender.includes("delivery.testPlayerId"),
);
check(
  "generic push route uses centralized sender",
  generalRoute.includes('from "@/lib/server/push-sender"') &&
    !generalRoute.includes('from "web-push"'),
);
check(
  "training notification route exposes suppressed result",
  trainingRoute.includes("result.suppressed") &&
    trainingRoute.includes("TRAINING NOTIFICATION SUPPRESSED"),
);
check(
  "verification npm script exists",
  pkg.scripts?.["verify:push-environment-safety"] ===
    "node scripts/sprint-05.3.5.2/verify-push-environment-safety.mjs",
);

console.log("Sprint 05.3.5.2 Push Environment Safety verification");
console.table(checks);

const failed = checks.filter((item) => !item.ok);

if (failed.length) {
  console.error(`Verification FAILED: ${failed.length} check(s).`);
  process.exit(1);
}

console.log("Verification PASS.");
console.log("No database rows were changed by this verification.");
