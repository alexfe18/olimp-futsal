import fs from "node:fs";

const source = fs.readFileSync("components/Training.tsx", "utf8");

const checks = {
  auth_session_bootstrap_preserved:
    source.includes("async function bootstrapAuthenticatedBoard()") &&
    source.includes("await supabase.auth.getSession()"),
  auth_reload_deferred_preserved:
    source.includes("authReloadTimer = window.setTimeout(() =>") &&
    source.includes("void loadTrainingData();"),
  browser_timer_type_fixed:
    source.includes("let authReloadTimer: number | null = null;"),
  old_incompatible_timer_type_removed:
    !source.includes("ReturnType<typeof window.setTimeout>"),
  protected_board_rpc_preserved:
    source.includes('supabase.rpc("get_training_attendance_board"'),
  attendance_api_preserved:
    source.includes('fetch("/api/attendance/respond"'),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

console.log(JSON.stringify({
  verification: "Sprint 05.3.6.2 B.6.4.1.1 Timer Type Hotfix",
  pass: failed.length === 0,
  failed,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
