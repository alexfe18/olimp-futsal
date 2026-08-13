import fs from "node:fs";

const checks = [];
const add = (name, ok, details = "") => checks.push({ name, ok, details });

const login = fs.readFileSync("app/login/page.tsx", "utf8");
const helper = fs.readFileSync("lib/auth/login-environment.ts", "utf8");
const admin = fs.readFileSync("app/admin/login/page.tsx", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

add("release version", pkg.version === "0.6.0-alpha.9", pkg.version);
add(
  "player login imports environment helper",
  login.includes('getPlayerLoginEnvironment'),
);
add(
  "DEV player login uses email/password",
  login.includes('email: normalizedIdentifier.toLowerCase()'),
);
add(
  "PROD player login still uses phone/password",
  login.includes('phone: normalizeUkrainianLoginPhone(normalizedIdentifier)!'),
);
add(
  "first-sign-in enforcement preserved",
  login.includes('context.must_change_password') &&
    login.includes('router.replace("/account/change-password")'),
);
add(
  "admin login remains email-based",
  admin.includes("signInWithPassword") && admin.includes("email: normalizedEmail"),
);
add(
  "explicit public app environment exists",
  helper.includes("NEXT_PUBLIC_APP_ENV"),
);
add(
  "DEV Supabase guard exists",
  helper.includes("nlevvchzmvwjqxqdmoov"),
);
add(
  "PROD Supabase guard exists",
  helper.includes("vijtvhweppcvhqsnkvfx"),
);
add(
  "safe unset default is production",
  helper.includes('return "production"'),
);

console.log("Sprint 05.3.6.2 B.3.3 Environment-Aware Login verification");
console.table(checks);

if (checks.some((check) => !check.ok)) {
  console.error("Verification FAILED.");
  process.exit(1);
}

console.log("Verification PASS.");
console.log("No database rows were changed by this verification.");
