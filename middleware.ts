import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getBrowserKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = getSupabaseUrl();
  const key = getBrowserKey();
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          // Persist refreshed session cookies on the response
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refreshes session cookies when present (required for SSR auth)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Logged-in users hitting the marketing home → dashboard
  if (user && path === "/") {
    const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
    return copyCookies(response, redirect);
  }

  // Guests cannot open the dashboard
  if (!user && (path === "/dashboard" || path.startsWith("/dashboard/"))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    const redirect = NextResponse.redirect(login);
    return copyCookies(response, redirect);
  }

  // Logged-in users don't need auth pages
  if (user && (path === "/login" || path === "/signup")) {
    const next = request.nextUrl.searchParams.get("next");
    const dest =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/dashboard";
    const redirect = NextResponse.redirect(new URL(dest, request.url));
    return copyCookies(response, redirect);
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard", "/dashboard/:path*", "/login", "/signup"],
};
