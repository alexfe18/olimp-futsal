#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function readEnvFile() {
  const envPath = path.join(root, ".env.local");

  if (!fs.existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

const packageJson = readJson("package.json");
const listPage = read("app/player/trainings/page.tsx");
const detailPage = read("app/player/trainings/[trainingId]/page.tsx");
const visibility = read("lib/player/training-visibility.ts");
const profilePage = read("app/player/profile/page.tsx");
const env = readEnvFile();

const checks = {
  version_alpha_14: packageJson.version === "0.6.0-alpha.14",

  list_loads_attendance_presentation:
    listPage.includes("loadPlayerTrainingAttendancePresentation") &&
    listPage.includes("Ваша відповідь: Буду") &&
    listPage.includes("Під питанням") &&
    listPage.includes("Не будуть"),

  detail_keeps_authenticated_rsvp:
    detailPage.includes('fetch("/api/attendance/respond"') &&
    detailPage.includes("Authorization: `Bearer ${session.access_token}`") &&
    detailPage.includes("get_my_training_attendance"),

  detail_shows_counts_without_names:
    detailPage.includes("Відповіді команди") &&
    detailPage.includes("attendanceSummary.yes") &&
    detailPage.includes("attendanceSummary.maybe") &&
    detailPage.includes("attendanceSummary.no") &&
    !detailPage.includes("AttendanceList"),

  presentation_query_is_minimal:
    visibility.includes('.select("training_id,player_id,status")') &&
    !visibility.includes('select("training_id,player_id,player_name,status")'),

  profile_mobile_identifier_polish:
    profilePage.includes(
      "flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between",
    ) &&
    profilePage.includes("min-w-0 break-words font-black"),

  local_development_app:
    (env.NEXT_PUBLIC_APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV) ===
    "development",

  attendance_dev_mode:
    (env.ATTENDANCE_WRITE_MODE ?? process.env.ATTENDANCE_WRITE_MODE) === "dev",

  push_disabled:
    (env.PUSH_SEND_MODE ?? process.env.PUSH_SEND_MODE) === "disabled",
};

const failed = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

const result = {
  verification: "Sprint 05.3.6.2 B.6.3 Training Presentation",
  pass: failed.length === 0,
  failed,
  checks,
  safe_state: {
    app_environment:
      env.NEXT_PUBLIC_APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? null,
    attendance_mode:
      env.ATTENDANCE_WRITE_MODE ?? process.env.ATTENDANCE_WRITE_MODE ?? null,
    push_mode: env.PUSH_SEND_MODE ?? process.env.PUSH_SEND_MODE ?? null,
  },
};

console.log(JSON.stringify(result, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
