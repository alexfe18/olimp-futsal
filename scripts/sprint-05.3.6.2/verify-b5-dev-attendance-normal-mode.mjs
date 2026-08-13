import fs from "node:fs";

const envSource = fs.readFileSync("lib/server/attendance-environment.ts", "utf8");
const routeSource = fs.readFileSync("app/api/attendance/respond/route.ts", "utf8");
const loginSource = fs.readFileSync("lib/auth/login-environment.ts", "utf8");
const localEnv = fs.readFileSync(".env.local", "utf8");

const devRef = loginSource.match(/const\s+DEV_PROJECT_REF\s*=\s*"([^"]+)"/)?.[1] ?? "";
const supabaseUrl = localEnv.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim() ?? "";
const appEnv = localEnv.match(/^NEXT_PUBLIC_APP_ENV=(.*)$/m)?.[1]?.trim() ?? "";
const attendanceMode = localEnv.match(/^ATTENDANCE_WRITE_MODE=(.*)$/m)?.[1]?.trim() ?? "";
const pushMode = localEnv.match(/^PUSH_SEND_MODE=(.*)$/m)?.[1]?.trim() ?? "";

const checks = {
  mode_union_has_dev:
    envSource.includes('AttendanceWriteMode = "disabled" | "test" | "dev" | "live"'),
  supported_modes_has_dev:
    /SUPPORTED_MODES[\s\S]*"disabled"[\s\S]*"test"[\s\S]*"dev"[\s\S]*"live"/.test(envSource),
  preserves_test_target_guard:
    envSource.includes("ATTENDANCE_TEST_PLAYER_ID") &&
    envSource.includes("ATTENDANCE_TEST_TRAINING_ID") &&
    envSource.includes("test_target_mismatch"),
  preserves_live_vercel_guard:
    envSource.includes('process.env.VERCEL === "1"') &&
    envSource.includes('process.env.VERCEL_ENV === "production"') &&
    envSource.includes("live_outside_vercel_production"),
  dev_requires_authenticated:
    envSource.includes("dev_requires_authenticated_player") &&
    envSource.includes("if (!input.authenticated)"),
  dev_reuses_login_environment_guard:
    envSource.includes("getPlayerLoginEnvironment") &&
    envSource.includes("loginEnvironment.isNonProduction") &&
    envSource.includes("dev_environment_invalid"),
  dev_write_present:
    envSource.includes('reason: "dev_write"'),
  route_passes_authenticated:
    /getAttendanceWriteDecision\(\{[\s\S]*?authenticated:\s*Boolean\(authenticatedProfileId\)[\s\S]*?\}\);/.test(routeSource),
  local_mode_dev: attendanceMode === "dev",
  local_nonproduction_app: appEnv === "development" || appEnv === "preview",
  isolated_dev_supabase: Boolean(devRef) && supabaseUrl.includes(devRef),
  push_disabled: pushMode === "disabled",
};

const failed = Object.entries(checks).filter(([,v]) => !v).map(([k]) => k);

console.log(JSON.stringify({
  verification: "Sprint 05.3.6.2 B.5 DEV Attendance Normal Mode",
  pass: failed.length === 0,
  failed,
  checks,
  safe_state: {
    app_environment: appEnv,
    attendance_mode: attendanceMode,
    isolated_dev_supabase: Boolean(devRef) && supabaseUrl.includes(devRef),
    push_mode: pushMode,
  },
}, null, 2));

if (failed.length) process.exit(1);
