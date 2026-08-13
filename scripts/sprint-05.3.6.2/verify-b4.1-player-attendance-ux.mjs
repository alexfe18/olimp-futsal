import fs from "node:fs";

const page = fs.readFileSync(
  "app/player/trainings/[trainingId]/page.tsx",
  "utf8",
);
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const checks = [];
const add = (name, ok, details = "") => checks.push({ name, ok, details });

add("release version", pkg.version === "0.6.0-alpha.10", pkg.version);
add(
  "attendance type supports maybe",
  page.includes('type PlayerAttendanceStatus = "yes" | "maybe" | "no"'),
);
add(
  "attendance loader preserves maybe",
  page.includes('status === "maybe"') &&
    page.includes("isPlayerAttendanceStatus"),
);
add(
  "maybe button exists",
  page.includes('saveAttendance("maybe")') &&
    page.includes("? Під питанням"),
);
add(
  "maybe heading exists",
  page.includes("Ваша участь під питанням"),
);
add(
  "maybe success copy exists",
  page.includes("Ви поки не впевнені щодо участі у тренуванні."),
);
add(
  "yes flow preserved",
  page.includes('saveAttendance("yes")') && page.includes("✓ Буду"),
);
add(
  "no flow preserved",
  page.includes('saveAttendance("no")') && page.includes("✕ Не буду"),
);
add(
  "authenticated attendance API preserved",
  page.includes('fetch("/api/attendance/respond"') &&
    page.includes("Authorization: `Bearer ${session.access_token}`"),
);
add(
  "training list navigation exists",
  page.includes('href="/player/trainings"') &&
    page.includes("← До тренувань"),
);
add(
  "player dashboard navigation exists",
  page.includes('href="/player"') &&
    page.includes("До кабінету →"),
);
add(
  "three-column desktop attendance layout exists",
  page.includes("md:grid-cols-3"),
);

console.log("Sprint 05.3.6.2 B.4.1 Player Attendance UX verification");
console.table(checks);

if (checks.some((check) => !check.ok)) {
  console.error("Verification FAILED.");
  process.exit(1);
}

console.log("Verification PASS.");
console.log("No database rows were changed by this verification.");
