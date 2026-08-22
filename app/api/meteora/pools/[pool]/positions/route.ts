import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { loadPoolPositions } from "@/lib/meteora/pool-positions"
import { isValidSolanaAddress } from "@/lib/utils"

export const runtime = "nodejs"
export const maxDuration = 60

type Params = { params: Promise<{ pool: string }> }

export async function GET(request: Request, { params }: Params) {
  const { pool: rawPool } = await params
  const pool = decodeURIComponent(rawPool || "").trim()
  const url = new URL(request.url)
  const wallet = (url.searchParams.get("wallet") || "").trim()
  if (!isValidSolanaAddress(pool) || !isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: "Invalid pool or wallet address" },
      { status: 400 },
    )
  }
  const refresh = url.searchParams.get("refresh") === "1"

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const result = await loadPoolPositions(supabase, pool, wallet, { refresh })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load pool positions",
      },
      { status: 502 },
    )
  }
}
