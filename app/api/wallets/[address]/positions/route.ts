import { NextResponse } from "next/server"

function backendBaseUrl() {
  return (
    process.env.YS_BACKEND_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    ""
  ).replace(/\/$/, "")
}

type Ctx = { params: Promise<{ address: string }> }

export async function GET(_request: Request, ctx: Ctx) {
  const { address } = await ctx.params
  const wallet = decodeURIComponent(address || "").trim()
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

  try {
    const res = await fetch(
      `${base}/positions?wallet=${encodeURIComponent(wallet)}`,
      { cache: "no-store" },
    )
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            (json && typeof json === "object" && "error" in json
              ? String((json as { error?: unknown }).error)
              : null) || `Backend positions failed (${res.status})`,
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
