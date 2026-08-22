import { NextResponse } from "next/server"

function backendBaseUrl() {
  return (
    process.env.YS_BACKEND_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    ""
  ).replace(/\/$/, "")
}

/** RPC scan takes a while for large windows — keep the lambda alive for it. */
export const maxDuration = 120

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    wallet?: unknown
    limit?: unknown
    concurrency?: unknown
    before?: unknown
    until?: unknown
    filterWatchlist?: unknown
    includeNested?: unknown
    includeEvents?: unknown
    includeTransactions?: unknown
    includeSkipped?: unknown
  } | null

  const wallet = typeof body?.wallet === "string" ? body.wallet.trim() : ""
  if (wallet.length < 32 || wallet.length > 44) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  const base = backendBaseUrl()
  if (!base) {
    return NextResponse.json(
      { error: "YS_BACKEND_URL is not configured." },
      { status: 503 },
    )
  }

  const payload: Record<string, unknown> = { wallet }
  if (typeof body?.limit === "number") payload.limit = body.limit
  if (typeof body?.concurrency === "number") {
    payload.concurrency = body.concurrency
  }
  if (typeof body?.before === "string") payload.before = body.before
  if (typeof body?.until === "string") payload.until = body.until
  if (typeof body?.filterWatchlist === "boolean") {
    payload.filter_watchlist = body.filterWatchlist
  }
  if (typeof body?.includeNested === "boolean") {
    payload.include_nested = body.includeNested
  }
  if (typeof body?.includeEvents === "boolean") {
    payload.include_events = body.includeEvents
  }
  if (typeof body?.includeTransactions === "boolean") {
    payload.include_transactions = body.includeTransactions
  }
  if (typeof body?.includeSkipped === "boolean") {
    payload.include_skipped = body.includeSkipped
  }

  try {
    const res = await fetch(`${base}/debug/extract-wallet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            (json && typeof json === "object" && "error" in json
              ? String((json as { error?: unknown }).error)
              : null) || `Backend extract failed (${res.status})`,
        },
        { status: res.status === 400 ? 400 : 502 },
      )
    }
    return NextResponse.json(json)
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Backend unreachable: ${err.message}`
            : "Backend unreachable",
      },
      { status: 502 },
    )
  }
}
