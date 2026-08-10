export type AttendanceWriteMode = "disabled" | "test" | "live";

export type AttendanceRuntimeEnvironment =
  | "local"
  | "preview"
  | "production";

export type AttendanceWriteDecision = {
  allowed: boolean;
  configuredMode: AttendanceWriteMode;
  runtime: AttendanceRuntimeEnvironment;
  reason:
    | "attendance_disabled"
    | "live_outside_vercel_production"
    | "test_target_not_configured"
    | "test_target_mismatch"
    | "test_write"
    | "live_write";
};

const SUPPORTED_MODES = new Set<AttendanceWriteMode>([
  "disabled",
  "test",
  "live",
]);

function getConfiguredMode(): AttendanceWriteMode {
  const rawMode = process.env.ATTENDANCE_WRITE_MODE?.trim().toLowerCase();

  if (
    rawMode &&
    SUPPORTED_MODES.has(rawMode as AttendanceWriteMode)
  ) {
    return rawMode as AttendanceWriteMode;
  }

  return "disabled";
}

function getRuntimeEnvironment(): AttendanceRuntimeEnvironment {
  const vercelEnvironment =
    process.env.VERCEL_ENV?.trim().toLowerCase();

  if (vercelEnvironment === "production") {
    return "production";
  }

  if (vercelEnvironment === "preview") {
    return "preview";
  }

  return "local";
}

export function getAttendanceWriteDecision(input: {
  playerId: string;
  trainingId: string;
}): AttendanceWriteDecision {
  const configuredMode = getConfiguredMode();
  const runtime = getRuntimeEnvironment();

  if (configuredMode === "disabled") {
    return {
      allowed: false,
      configuredMode,
      runtime,
      reason: "attendance_disabled",
    };
  }

  if (configuredMode === "live") {
    const isVercelProduction =
      process.env.VERCEL === "1" &&
      process.env.VERCEL_ENV === "production";

    if (!isVercelProduction) {
      return {
        allowed: false,
        configuredMode,
        runtime,
        reason: "live_outside_vercel_production",
      };
    }

    return {
      allowed: true,
      configuredMode,
      runtime: "production",
      reason: "live_write",
    };
  }

  const testPlayerId =
    process.env.ATTENDANCE_TEST_PLAYER_ID?.trim();
  const testTrainingId =
    process.env.ATTENDANCE_TEST_TRAINING_ID?.trim();

  if (!testPlayerId || !testTrainingId) {
    return {
      allowed: false,
      configuredMode,
      runtime,
      reason: "test_target_not_configured",
    };
  }

  if (
    input.playerId !== testPlayerId ||
    input.trainingId !== testTrainingId
  ) {
    return {
      allowed: false,
      configuredMode,
      runtime,
      reason: "test_target_mismatch",
    };
  }

  return {
    allowed: true,
    configuredMode,
    runtime,
    reason: "test_write",
  };
}
