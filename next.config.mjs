/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
  async redirects() {
    const app = "https://app.yieldsync.io"
    const hosts = ["yieldsync.io", "www.yieldsync.io"]
    const routes = [
      ["/login", `${app}/login`],
      ["/signup", `${app}/signup`],
      ["/dashboard", `${app}/`],
      ["/dashboard/:path*", `${app}/:path*`],
      ["/discover", `${app}/discover`],
      ["/activities", `${app}/activities`],
      ["/tracking-wallets", `${app}/tracking-wallets`],
      ["/strategies", `${app}/strategies`],
      ["/trading-wallets", `${app}/trading-wallets`],
      ["/positions", `${app}/positions`],
      ["/plans", `${app}/plans`],
      ["/billing", `${app}/billing`],
      ["/settings", `${app}/settings`],
      ["/documentation", `${app}/documentation`],
      ["/wallet/:path*", `${app}/wallet/:path*`],
      ["/auth/:path*", `${app}/auth/:path*`],
    ]
    return hosts.flatMap((host) =>
      routes.map(([source, destination]) => ({
        source,
        has: [{ type: "host", value: host }],
        destination,
        permanent: true,
      })),
    )
  },
}

export default nextConfig
