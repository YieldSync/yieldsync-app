import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  getSupabaseBrowserKey,
  getSupabaseUrl,
  isValidSupabaseUrl,
} from "@/lib/supabase/env"

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value)
  })
  return to
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = getSupabaseUrl()
  const key = getSupabaseBrowserKey()

  // Never throw from middleware — bad env must not 500 the whole site.
  if (!isValidSupabaseUrl(url) || !key) return response

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    if (!user && (path === "/dashboard" || path.startsWith("/dashboard/"))) {
      const login = new URL("/login", request.url)
      login.searchParams.set("next", path)
      return copyCookies(response, NextResponse.redirect(login))
    }

    if (user && (path === "/login" || path === "/signup")) {
      const next = request.nextUrl.searchParams.get("next")
      const dest =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/dashboard"
      return copyCookies(
        response,
        NextResponse.redirect(new URL(dest, request.url)),
      )
    }

    return response
  } catch {
    return response
  }
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/auth/callback",
    "/auth/signout",
  ],
}
