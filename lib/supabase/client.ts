import { createBrowserClient } from "@supabase/ssr";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

/** New publishable key or legacy anon key */
function getBrowserKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

export function createClient() {
  const url = getSupabaseUrl();
  const key = getBrowserKey();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and publishable/anon key in .env.local",
    );
  }

  return createBrowserClient(url, key);
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getBrowserKey());
}
