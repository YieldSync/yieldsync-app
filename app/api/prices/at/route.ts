import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  bucketTimestamp,
  resolvePrices,
  type PriceRequest,
} from "@/lib/prices/token-prices"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_ITEMS = 400

type Body = {
  items?: unknown
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const raw = Array.isArray(body.items) ? body.items : []
  const items: PriceRequest[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const { mint, timestamp } = entry as { mint?: unknown; timestamp?: unknown }
    const address = String(mint ?? "").trim()
    const ts = Number(timestamp)
    if (address.length < 32 || address.length > 64) continue
    if (!Number.isFinite(ts) || ts <= 0) continue
    items.push({ mint: address, ts: bucketTimestamp(Math.floor(ts)) })
  }
  if (!items.length) {
    return NextResponse.json({ prices: {}, fetched: 0, missing: 0 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const result = await resolvePrices(supabase, items.slice(0, MAX_ITEMS))
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve prices" },
      { status: 500 },
    )
  }
}
