import fs from "node:fs";

const source = fs.readFileSync("lib/supabase.ts", "utf8");

const checks = {
  validated_url_string:
    source.includes("const resolvedSupabaseUrl: string = supabaseUrl;"),
  validated_key_string:
    source.includes(
      "const resolvedSupabasePublishableKey: string = supabasePublishableKey;",
    ),
  create_client_uses_validated_values:
    source.includes(
      "createClient(resolvedSupabaseUrl, resolvedSupabasePublishableKey",
    ),
  storage_key_uses_validated_url:
    source.includes("getProjectRef(resolvedSupabaseUrl)"),
  auth_persistence_preserved:
    source.includes("persistSession: true") &&
    source.includes("autoRefreshToken: true") &&
    source.includes("storageKey: authStorageKey"),
  hmr_singleton_preserved:
    source.includes("__olimpSupabaseClient"),
};

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

console.log(JSON.stringify({
  verification: "Sprint 05.3.6.2 B.6.4.2.1 Supabase Env Type Hotfix",
  pass: failed.length === 0,
  failed,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
