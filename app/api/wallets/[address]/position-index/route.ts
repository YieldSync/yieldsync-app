import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  listIndexedPositions,
  rebuildPositionIndex,
} from "@/lib/meteora/position-index"
import { isValidSolanaAddress } from "@/lib/utils"

export const runtime = "nodejs"
/** Rebuilding scans the wallet's transaction history through the backend. */
export const maxDuration = 120

const DEFAULT_SCAN_LIMIT = 1000
const MAX_SCAN_LIMIT = 5000

function backendBaseUrl() {
  return (
    process.env.YS_BACKEND_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    ""
  ).replace(/\/$/, "")
}

type Params = { params: Promise<{ address: string }> }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET(request: Request, { params }: Params) {
  const { address } = await params
  const wallet = decodeURIComponent(address || "").trim()
  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }
  const pool = new URL(request.url).searchParams.get("pool")?.trim() || undefined

  const { supabase, user } = await requireUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }
  const positions = await listIndexedPositions(supabase, wallet, pool)
  return NextResponse.json({ wallet, pool: pool ?? null, positions })
}

export async function POST(request: Request, { params }: Params) {
  const { address } = await params
  const wallet = decodeURIComponent(address || "").trim()
  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as {
    limit?: unknown
  } | null
  const limit = Math.min(
    MAX_SCAN_LIMIT,
    Math.max(100, Number(body?.limit) || DEFAULT_SCAN_LIMIT),
  )

  const base = backendBaseUrl()
  if (!base) {
    return NextResponse.json(
      { error: "YS_BACKEND_URL is not configured." },
      { status: 503 },
    )
  }

  const { supabase, user } = await requireUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const result = await rebuildPositionIndex(supabase, wallet, {
      backendUrl: base,
      limit,
    })
    const positions = await listIndexedPositions(supabase, wallet)
    return NextResponse.json({ wallet, ...result, positions })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to index positions",
      },
      { status: 502 },
    )
  }
}
