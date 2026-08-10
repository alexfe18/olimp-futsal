export type PushSendMode = "disabled" | "test" | "live";

export type PushRuntimeEnvironment =
  | "local"
  | "preview"
  | "production";

export type PushDeliveryDecision = {
  allowed: boolean;
  configuredMode: PushSendMode;
  runtime: PushRuntimeEnvironment;
  reason:
    | "push_disabled"
    | "live_outside_vercel_production"
    | "test_player_not_configured"
    | "test_delivery"
    | "live_delivery";
  testPlayerId?: string;
};

const SUPPORTED_MODES = new Set<PushSendMode>([
  "disabled",
  "test",
  "live",
]);

function getConfiguredMode(): PushSendMode {
  const rawMode = process.env.PUSH_SEND_MODE?.trim().toLowerCase();

  if (rawMode && SUPPORTED_MODES.has(rawMode as PushSendMode)) {
    return rawMode as PushSendMode;
  }

  return "disabled";
}

function getRuntimeEnvironment(): PushRuntimeEnvironment {
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

export function getPushDeliveryDecision(): PushDeliveryDecision {
  const configuredMode = getConfiguredMode();
  const runtime = getRuntimeEnvironment();

  if (configuredMode === "disabled") {
    return {
      allowed: false,
      configuredMode,
      runtime,
      reason: "push_disabled",
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
      reason: "live_delivery",
    };
  }

  const testPlayerId = process.env.PUSH_TEST_PLAYER_ID?.trim();

  if (!testPlayerId) {
    return {
      allowed: false,
      configuredMode,
      runtime,
      reason: "test_player_not_configured",
    };
  }

  return {
    allowed: true,
    configuredMode,
    runtime,
    reason: "test_delivery",
    testPlayerId,
  };
}
