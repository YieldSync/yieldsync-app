import { NextResponse } from "next/server"

type BalanceRow = {
  address: string
  lamports: number
  sol: number
  ok: boolean
  error?: string
}

function backendBaseUrl() {
  return (
    process.env.YS_BACKEND_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    ""
  ).replace(/\/$/, "")
}

/**
 * Proxies SOL balance lookups to the Rust YieldSync backend.
 * No direct RPC / Privy calls from Next — the backend owns chain access.
 */
export async function POST(request: Request) {
  const base = backendBaseUrl()
  if (!base) {
    return NextResponse.json(
      {
        error:
          "YS_BACKEND_URL is not configured. Set it to the Rust backend (e.g. http://127.0.0.1:8080).",
      },
      { status: 503 },
    )
  }

  let body: { addresses?: string[] }
  try {
    body = (await request.json()) as { addresses?: string[] }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const addresses = (body.addresses ?? [])
    .map((a) => String(a ?? "").trim())
    .filter((a) => a.length > 20)
    .slice(0, 32)

  if (addresses.length === 0) {
    return NextResponse.json({ balances: [] as BalanceRow[] })
  }

  try {
    const res = await fetch(`${base}/wallets/balances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses }),
      cache: "no-store",
    })
    const json = (await res.json().catch(() => null)) as
      | { balances?: BalanceRow[]; error?: string }
      | null
    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            json?.error ||
            `Backend balance request failed (${res.status})`,
        },
        { status: res.status === 503 ? 503 : 502 },
      )
    }
    return NextResponse.json({ balances: json?.balances ?? [] })
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
