import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { enrichPools } from "@/lib/pools/meteora-cache"

export const runtime = "nodejs"

type Body = {
  addresses?: unknown
  force?: unknown
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const raw = Array.isArray(body.addresses) ? body.addresses : []
  const addresses = raw
    .map((a) => String(a ?? "").trim())
    .filter((a) => a.length >= 32 && a.length <= 64)
  const unique = [...new Set(addresses)].slice(0, 40)
  if (!unique.length) {
    return NextResponse.json({ pools: {} })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const pools = await enrichPools(supabase, unique, {
      force: body.force === true,
    })
    return NextResponse.json({ pools })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to enrich pools",
      },
      { status: 500 },
    )
  }
}
