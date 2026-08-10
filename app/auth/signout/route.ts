import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
}

function getBrowserKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  )
}

/** Server-side sign-out — clears auth cookies even if the client bundle lacks env. */
export async function POST(request: Request) {
  const url = getSupabaseUrl()
  const key = getBrowserKey()
  const cookieStore = await cookies()

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })
    await supabase.auth.signOut()
  } else {
    // Best-effort clear of known sb cookies if env missing
    cookieStore.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-") || name.includes("supabase")) {
        cookieStore.set(name, "", { path: "/", maxAge: 0 })
      }
    })
  }

  const origin = new URL(request.url).origin
  return NextResponse.redirect(new URL("/login", origin), { status: 303 })
}

export async function GET(request: Request) {
  return POST(request)
}
