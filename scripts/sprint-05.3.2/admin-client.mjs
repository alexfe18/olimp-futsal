import { createClient } from "@supabase/supabase-js";

export function resolveAdminCredentials(env = process.env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = env.SUPABASE_SECRET_KEY || "";
  const legacyNamedKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const adminKey = secretKey || legacyNamedKey;
  const keySource = secretKey
    ? "SUPABASE_SECRET_KEY"
    : legacyNamedKey
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : null;
  const keyType = adminKey.startsWith("sb_secret_")
    ? "new_secret_key"
    : adminKey.split(".").length === 3
      ? "legacy_jwt_key"
      : "unknown";

  if (!supabaseUrl || !adminKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  return { supabaseUrl, adminKey, keySource, keyType };
}

export function createAdminClient(env = process.env) {
  const credentials = resolveAdminCredentials(env);
  const client = createClient(credentials.supabaseUrl, credentials.adminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return { client, ...credentials };
}

export function formatSupabaseError(error) {
  if (!error) return "unknown_error";
  if (typeof error === "string") return error;

  const fields = [
    ["message", error.message],
    ["code", error.code],
    ["status", error.status],
    ["name", error.name],
    ["details", error.details],
    ["hint", error.hint],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  if (fields.length) {
    return fields.map(([key, value]) => `${key}=${String(value)}`).join("; ");
  }

  try {
    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    // Fall through.
  }

  return String(error);
}

export function isTransientSupabaseError(error) {
  const text = formatSupabaseError(error).toLowerCase();
  const status = Number(error?.status ?? 0);
  return (
    text.includes("jwt issued at future") ||
    text.includes("fetch failed") ||
    text.includes("network") ||
    text.includes("timed out") ||
    text.includes("timeout") ||
    status === 429 ||
    (status >= 500 && status <= 504)
  );
}

export async function withTransientRetry(
  operation,
  { label = "Supabase operation", attempts = 5, baseDelayMs = 1500 } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (!isTransientSupabaseError(error) || attempt === attempts) throw error;

      const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), 12000);
      console.warn(
        `${label}: transient Supabase error (${formatSupabaseError(error)}). ` +
          `Retry ${attempt}/${attempts - 1} after ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
