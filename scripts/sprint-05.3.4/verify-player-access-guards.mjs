import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const packageJson = JSON.parse(read("package.json"));
const checks = [];

function check(name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details });
}

check("release version", packageJson.version === "0.6.0-alpha.5", packageJson.version);
check("player layout exists", exists("app/player/layout.tsx"));
check("PlayerAccessGate exists", exists("components/auth/PlayerAccessGate.tsx"));
check("access-control helper exists", exists("lib/auth/access-control.ts"));

const layout = read("app/player/layout.tsx");
const playerPage = read("app/player/page.tsx");
const playerGate = read("components/auth/PlayerAccessGate.tsx");
const adminGate = read("components/auth/AdminAccessGate.tsx");
const accessControl = read("lib/auth/access-control.ts");

check(
  "all /player routes inherit PlayerAccessGate",
  layout.includes("PlayerAccessGate") && layout.includes("{children}"),
);
check(
  "player home uses verified session context",
  playerPage.includes("usePlayerSession") && !playerPage.includes("auth.getUser"),
);
check(
  "player gate validates server Auth user",
  playerGate.includes("supabase.auth.getUser()"),
);
check(
  "player gate loads access context",
  playerGate.includes('supabase.rpc("get_my_access_context")'),
);
check(
  "player gate tracks sign-out",
  playerGate.includes("onAuthStateChange") && playerGate.includes('event === "SIGNED_OUT"'),
);
check(
  "player access requires active adult membership",
  accessControl.includes('context.team?.code === "adult"') &&
    accessControl.includes('context.team?.membership_status === "active"') &&
    accessControl.includes('context.team_roles.includes("player")'),
);
check(
  "first-sign-in enforcement remains centralized",
  accessControl.includes('redirectTo: "/account/change-password"'),
);
check(
  "player cannot access admin routes",
  adminGate.includes("decideAdminRouteAccess"),
);
check(
  "admin without player membership leaves player area",
  accessControl.includes('redirectTo: "/admin"'),
);

console.log("Sprint 05.3.4 Player Session & Access Guards verification\n");
console.table(checks);

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`\nERROR: ${failed.length} verification check(s) failed.`);
  process.exit(1);
}

console.log("\nVerification PASS.");
console.log("No database rows were changed by this verification.");
