import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { loadWalletStats } from "@/lib/meteora/wallet-stats"
import { isValidSolanaAddress } from "@/lib/utils"

export const runtime = "nodejs"
export const maxDuration = 30

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet")?.trim() || ""
  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }
    const payload = await loadWalletStats(wallet)
    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load wallet stats" },
      { status: 502 },
    )
  }
}
