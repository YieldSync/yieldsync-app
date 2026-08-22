import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { loadPositionEvents } from "@/lib/meteora/position-events"
import type { PositionProtocol } from "@/lib/meteora/types"
import { isValidSolanaAddress } from "@/lib/utils"

function backendBaseUrl() {
  return (
    process.env.YS_BACKEND_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    ""
  ).replace(/\/$/, "")
}

export const runtime = "nodejs"
export const maxDuration = 60

type Params = { params: Promise<{ position: string }> }

export async function GET(request: Request, { params }: Params) {
  const { position: raw } = await params
  const position = decodeURIComponent(raw || "").trim()
  if (!isValidSolanaAddress(position)) {
    return NextResponse.json(
      { error: "Invalid position address" },
      { status: 400 },
    )
  }
  const url = new URL(request.url)
  const refresh = url.searchParams.get("refresh") === "1"
  const protocol = url.searchParams.get("protocol") as PositionProtocol | null
  const decimalsX = Number(url.searchParams.get("decimalsX"))
  const decimalsY = Number(url.searchParams.get("decimalsY"))
  const mintX = url.searchParams.get("mintX")
  const mintY = url.searchParams.get("mintY")

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const { events, cached } = await loadPositionEvents(supabase, position, {
      refresh,
      protocol: protocol === "damm2" || protocol === "dlmm" ? protocol : undefined,
      backendUrl: backendBaseUrl() || undefined,
      decimalsX: Number.isFinite(decimalsX) ? decimalsX : null,
      decimalsY: Number.isFinite(decimalsY) ? decimalsY : null,
      mintX: mintX || null,
      mintY: mintY || null,
    })
    return NextResponse.json({ position, events, cached })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load position events",
      },
      { status: 502 },
    )
  }
}
