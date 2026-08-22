import { NextResponse } from "next/server"
import {
  fetchPrivyWalletPermissions,
  getPrivyServerConfig,
} from "@/lib/privy/server"

/**
 * Look up YieldSync session-signer grants on Privy wallets.
 * Body: { walletIds: string[] }
 */
export async function POST(request: Request) {
  if (!getPrivyServerConfig()) {
    return NextResponse.json(
      {
        error:
          "PRIVY_APP_ID / PRIVY_APP_SECRET not configured for server-side Privy API.",
      },
      { status: 503 },
    )
  }

  let body: { walletIds?: string[] }
  try {
    body = (await request.json()) as { walletIds?: string[] }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const walletIds = (body.walletIds ?? [])
    .map((id) => String(id ?? "").trim())
    .filter(Boolean)
    .slice(0, 32)

  if (walletIds.length === 0) {
    return NextResponse.json({ permissions: [] })
  }

  const permissions = []
  const errors: { walletId: string; error: string }[] = []

  for (const walletId of walletIds) {
    try {
      permissions.push(await fetchPrivyWalletPermissions(walletId))
    } catch (err) {
      errors.push({
        walletId,
        error: err instanceof Error ? err.message : "Privy lookup failed",
      })
    }
  }

  return NextResponse.json({ permissions, errors })
}
