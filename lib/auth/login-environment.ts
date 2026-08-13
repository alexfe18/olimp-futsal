export type AppEnvironment = "development" | "preview" | "production";

export type PlayerLoginEnvironment = {
  appEnvironment: AppEnvironment;
  identifier: "email" | "phone";
  isNonProduction: boolean;
};

const DEV_PROJECT_REF = "nlevvchzmvwjqxqdmoov";
const PROD_PROJECT_REF = "vijtvhweppcvhqsnkvfx";

function readAppEnvironment(): AppEnvironment {
  const configured = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();

  if (!configured) {
    // Safety default: never expose DEV email login merely because a variable
    // was forgotten in Production.
    return "production";
  }

  if (
    configured === "development" ||
    configured === "preview" ||
    configured === "production"
  ) {
    return configured;
  }

  throw new Error(
    `Unsupported NEXT_PUBLIC_APP_ENV "${configured}". Expected development, preview, or production.`,
  );
}

export function getPlayerLoginEnvironment(): PlayerLoginEnvironment {
  const appEnvironment = readAppEnvironment();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  if (appEnvironment === "production") {
    if (!supabaseUrl.includes(PROD_PROJECT_REF)) {
      throw new Error(
        "Production login environment must target the Production Supabase project.",
      );
    }

    return {
      appEnvironment,
      identifier: "phone",
      isNonProduction: false,
    };
  }

  if (!supabaseUrl.includes(DEV_PROJECT_REF)) {
    throw new Error(
      `${appEnvironment} login environment must target the isolated DEV Supabase project.`,
    );
  }

  return {
    appEnvironment,
    identifier: "email",
    isNonProduction: true,
  };
}
