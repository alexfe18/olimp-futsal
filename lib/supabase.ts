import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
}

if (!supabasePublishableKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured.");
}

// Preserve the validated string types inside helper/closure scopes.
const resolvedSupabaseUrl: string = supabaseUrl;
const resolvedSupabasePublishableKey: string = supabasePublishableKey;

function getProjectRef(url: string) {
  try {
    return new URL(url).hostname.split(".")[0] || "default";
  } catch {
    return "default";
  }
}

const projectRef = getProjectRef(resolvedSupabaseUrl);
const authStorageKey = `olimp-futsal-${projectRef}-auth`;

function createOlimpSupabaseClient() {
  return createClient(resolvedSupabaseUrl, resolvedSupabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: authStorageKey,
    },
  });
}

type OlimpBrowserGlobal = typeof globalThis & {
  __olimpSupabaseClient?: SupabaseClient;
};

const browserGlobal = globalThis as OlimpBrowserGlobal;

export const supabase =
  typeof window === "undefined"
    ? createOlimpSupabaseClient()
    : (browserGlobal.__olimpSupabaseClient ?? createOlimpSupabaseClient());

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV !== "production"
) {
  browserGlobal.__olimpSupabaseClient = supabase;
}
