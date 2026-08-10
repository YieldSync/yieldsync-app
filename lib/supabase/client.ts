import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseBrowserKey,
  getSupabaseUrl,
  isValidSupabaseUrl,
} from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

/**
 * Browser client with cookie storage (PKCE verifier + session).
 * detectSessionInUrl is off — /auth/callback/route.ts exchanges the code once
 * on the server so we don't race and burn the verifier.
 */
export function createClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseBrowserKey();

  if (!isValidSupabaseUrl(url) || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and publishable/anon key in .env.local",
    );
  }

  if (browserClient) return browserClient;

  browserClient = createBrowserClient(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return browserClient;
}

export function isSupabaseConfigured() {
  return isValidSupabaseUrl(getSupabaseUrl()) && Boolean(getSupabaseBrowserKey());
}
