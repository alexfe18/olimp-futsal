import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv, normalizeName } from "./audit-utils.mjs";

const projectRoot = process.cwd();
loadLocalEnv(projectRoot);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sources = [
  ["trainings", "team_name"],
  ["training_plans", "team_name"],
  ["training_templates", "team_name"],
];

const rows = [];
for (const [table, column] of sources) {
  const { data, error } = await supabase.from(table).select(column);
  if (error) {
    rows.push({ table, error: error.message, values: [] });
    continue;
  }

  const counts = new Map();
  for (const item of data ?? []) {
    const raw = item[column];
    if (!raw || !String(raw).trim()) continue;
    const key = normalizeName(raw);
    const current = counts.get(key) ?? { value: String(raw).trim(), count: 0 };
    current.count += 1;
    counts.set(key, current);
  }

  rows.push({
    table,
    error: null,
    values: [...counts.values()].sort((a, b) => b.count - a.count),
  });
}

const report = {
  generated_at: new Date().toISOString(),
  proposed_canonical_team: {
    code: "adult",
    name: "Олімп Футзал",
    category: "Доросла команда",
    is_active: true,
  },
  sources: rows,
  decision_required: [
    "Confirm canonical display name for the adult team.",
    "Confirm every legacy team_name value belongs to the adult team.",
    "Do not add youth teams until the adult-team pilot is stable.",
  ],
};

const outputDir = path.join(projectRoot, "audit-output");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "sprint-05.3.0-team-mapping-report.json");
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("Sprint 05.3.0 team mapping audit");
for (const source of rows) {
  console.log(`\n${source.table}`);
  if (source.error) console.log(`  ERROR: ${source.error}`);
  else if (!source.values.length) console.log("  No team_name values");
  else console.table(source.values);
}
console.log(`\nReport: ${path.relative(projectRoot, outputPath)}`);
