export const MARKETING_HOST = "yieldsync.io"
export const APP_HOST = "app.yieldsync.io"
export const MARKETING_ORIGIN = "https://yieldsync.io"
export const APP_ORIGIN = "https://app.yieldsync.io"

export function hostnameOf(hostHeader: string | null): string {
  return (hostHeader ?? "").split(":")[0].toLowerCase()
}

export function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
  )
}

/** Apex + www stay the marketing site. */
export function isMarketingHost(host: string): boolean {
  return host === MARKETING_HOST || host === `www.${MARKETING_HOST}`
}

export function isAppHost(host: string): boolean {
  return host === APP_HOST
}

/** Production custom domains where marketing and app are split. */
export function isSplitHost(host: string): boolean {
  return isMarketingHost(host) || isAppHost(host)
}

export function appPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return p
}

export function absoluteAppUrl(path: string): string {
  return `${APP_ORIGIN}${appPath(path)}`
}

/** Landing-page links into the product. Local stays same-origin; production always uses app. */
export function publicAppHref(path: string): string {
  const p = appPath(path)
  if (process.env.NODE_ENV !== "production") return p
  return `${APP_ORIGIN}${p}`
}

export function absoluteMarketingUrl(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${MARKETING_ORIGIN}${p}`
}

/** Product home: `/` on app.yieldsync.io, `/dashboard` locally (landing occupies `/`). */
export function appHomePath(host: string): string {
  return isAppHost(hostnameOf(host)) ? "/" : "/dashboard"
}

export function normalizeNextPath(
  raw: string | null | undefined,
  host: string,
): string {
  const home = appHomePath(host)
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return home
  if (
    isAppHost(hostnameOf(host)) &&
    (raw === "/dashboard" || raw.startsWith("/dashboard/"))
  ) {
    const rest = raw.slice("/dashboard".length)
    return !rest || rest === "/" ? "/" : rest
  }
  return raw
}
