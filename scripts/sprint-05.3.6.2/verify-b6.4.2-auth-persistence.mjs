import fs from "node:fs";

const supabase = fs.readFileSync("lib/supabase.ts", "utf8");
const login = fs.readFileSync("app/login/page.tsx", "utf8");
const gate = fs.readFileSync("components/auth/PlayerAccessGate.tsx", "utf8");
const training = fs.readFileSync("components/Training.tsx", "utf8");

const checks = {
  explicit_session_persistence:
    supabase.includes("persistSession: true") &&
    supabase.includes("autoRefreshToken: true") &&
    supabase.includes("storageKey: authStorageKey"),
  project_scoped_storage_key:
    supabase.includes("olimp-futsal-${projectRef}-auth"),
  hmr_stable_browser_singleton:
    supabase.includes("__olimpSupabaseClient") &&
    supabase.includes('process.env.NODE_ENV !== "production"'),
  login_honors_training_return:
    login.includes('candidate === "/training"') &&
    login.includes("window.location.replace(path)"),
  login_verifies_persisted_session:
    login.includes("[auth] login session persisted") &&
    login.includes("await supabase.auth.getSession()"),
  no_external_next_redirect:
    login.includes('candidate.startsWith("//")'),
  player_gate_ignores_initial_session:
    gate.includes('event === "INITIAL_SESSION"'),
  player_gate_defers_supabase_work:
    gate.includes("authVerifyTimer = window.setTimeout(() =>") &&
    gate.includes("void verifyAccess(false)"),
  training_auth_diagnostics:
    training.includes("[training-board] auth event") &&
    training.includes("expiresInSeconds"),
  protected_board_preserved:
    training.includes('supabase.rpc("get_training_attendance_board"'),
  attendance_api_preserved:
    training.includes('fetch("/api/attendance/respond"'),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

console.log(JSON.stringify({
  verification: "Sprint 05.3.6.2 B.6.4.2 Auth Persistence Hardening",
  pass: failed.length === 0,
  failed,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
