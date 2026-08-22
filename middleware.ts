import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  getSupabaseBrowserKey,
  getSupabaseUrl,
  isValidSupabaseUrl,
} from "@/lib/supabase/env"
import { isAppSectionPath } from "@/lib/navigation"
import {
  APP_ORIGIN,
  hostnameOf,
  isAppHost,
  isLocalHost,
  isMarketingHost,
  isSplitHost,
} from "@/lib/site"

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value)
  })
  return to
}

function withPath(origin: string, request: NextRequest) {
  return new URL(request.nextUrl.pathname + request.nextUrl.search, origin)
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const host = hostnameOf(request.headers.get("host"))
  const path = request.nextUrl.pathname
  const appRoot = isAppHost(host) && path === "/"

  // yieldsync.io = landing only. Never send "/" to app.
  // app.yieldsync.io = dashboard/login only. Never serve the landing page.
  if (!isLocalHost(host) && isSplitHost(host) && isMarketingHost(host)) {
    if (
      path === "/login" ||
      path === "/signup" ||
      path.startsWith("/auth/") ||
      isAppSectionPath(path)
    ) {
      return NextResponse.redirect(withPath(APP_ORIGIN, request), 308)
    }
  }

  const url = getSupabaseUrl()
  const key = getSupabaseBrowserKey()

  // Never throw from middleware — bad env must not 500 the whole site.
  if (!isValidSupabaseUrl(url) || !key) {
    if (appRoot) {
      return NextResponse.rewrite(new URL("/dashboard", request.url))
    }
    return response
  }

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

    if (
      !user &&
      (appRoot || isAppSectionPath(path) || path.startsWith("/wallet/"))
    ) {
      const login = new URL("/login", request.url)
      login.searchParams.set("next", appRoot ? "/dashboard" : path)
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

    if (appRoot) {
      return copyCookies(
        response,
        NextResponse.rewrite(new URL("/dashboard", request.url)),
      )
    }

    return response
  } catch {
    if (appRoot) {
      return NextResponse.rewrite(new URL("/dashboard", request.url))
    }
    return response
  }
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/wallet/:path*",
    "/login",
    "/signup",
    "/auth/callback",
    "/auth/signout",
    "/discover",
    "/activities",
    "/tracking-wallets",
    "/strategies",
    "/trading-wallets",
    "/positions",
    "/plans",
    "/billing",
    "/settings",
    "/documentation",
  ],
}
