import fs from "node:fs";

const source = fs.readFileSync("components/Training.tsx", "utf8");

const checks = {
  session_bootstrap:
    source.includes("async function bootstrapAuthenticatedBoard()") &&
    source.includes("await supabase.auth.getSession()") &&
    source.includes("await loadTrainingData(true)"),
  initial_session_not_competing:
    source.includes('if (event === "INITIAL_SESSION") return;'),
  auth_reload_deferred:
    source.includes("authReloadTimer = window.setTimeout(() =>") &&
    source.includes("void loadTrainingData();"),
  timer_cleanup:
    source.includes("window.clearTimeout(authReloadTimer)"),
  safe_diagnostics:
    source.includes('[training-board] session ready') &&
    source.includes('[training-board] viewer'),
  authenticated_denied_state:
    source.includes("Ви увійшли, але профіль гравця не визначено"),
  anonymous_gate_preserved:
    source.includes("Ви гравець Олімп Футзал?") &&
    source.includes('href="/login?next=/training"'),
  protected_rpc_preserved:
    source.includes('supabase.rpc("get_training_attendance_board"'),
  attendance_api_preserved:
    source.includes('fetch("/api/attendance/respond"'),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

console.log(JSON.stringify({
  verification: "Sprint 05.3.6.2 B.6.4.1 Training Board Auth Session Sync",
  pass: failed.length === 0,
  failed,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
