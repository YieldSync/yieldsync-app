import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  loadWalletPositions,
  type ProtocolFilter,
} from "@/lib/meteora/wallet-positions"
import type { PortfolioMode } from "@/lib/meteora/portfolio"
import { isValidSolanaAddress } from "@/lib/utils"

export const runtime = "nodejs"
/** Deep pages walk many pools, so give the request room. */
export const maxDuration = 60

const MAX_PAGE_SIZE = 50
const MAX_PREFETCH = 6

export async function GET(request: Request) {
  const url = new URL(request.url)
  const wallet = (url.searchParams.get("wallet") || "").trim()
  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }
  const rawProtocol = url.searchParams.get("protocol")
  const protocol: ProtocolFilter =
    rawProtocol === "dlmm" || rawProtocol === "damm2" ? rawProtocol : "all"
  const mode: PortfolioMode =
    url.searchParams.get("mode") === "open" ? "open" : "closed"
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(url.searchParams.get("pageSize") || 12) || 12),
  )
  const prefetchPages = Math.min(
    MAX_PREFETCH,
    Math.max(1, Number(url.searchParams.get("prefetch") || 3) || 3),
  )
  const refresh = url.searchParams.get("refresh") === "1"

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const slice = await loadWalletPositions(supabase, {
      wallet,
      mode,
      protocol,
      page,
      pageSize,
      prefetchPages,
      refresh,
    })
    return NextResponse.json(slice)
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to load positions",
      },
      { status: 502 },
    )
  }
}
