/** Strip accidental wrapping quotes from env values (Turbopack / Vercel inlining). */
export function cleanEnv(value: string | undefined | null) {
  return (value ?? "").trim().replace(/^["']|["']$/g, "")
}

export function getSupabaseUrl() {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
}

export function getSupabaseBrowserKey() {
  return cleanEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}

export function isValidSupabaseUrl(url: string) {
  return Boolean(url && /^https?:\/\//i.test(url))
}
