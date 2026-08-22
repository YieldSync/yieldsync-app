import type { SupabaseClient } from "@supabase/supabase-js"

const TABLE = "wallet_position_index"

/**
 * The portfolio history API aggregates by pool and never reports position
 * addresses, and closed position accounts are gone from the chain. The only
 * remaining source is the wallet's transaction history, which our backend
 * already decodes — we index the addresses here so expanding a closed pool row
 * can load its events.
 */
export type IndexedPosition = {
  wallet: string
  position: string
  pool: string | null
  protocol: string | null
  isClosed: boolean
  openedAt: number | null
  closedAt: number | null
  lastSlot: number | null
}

type DbRow = {
  wallet: string
  position: string
  pool: string | null
  protocol: string | null
  is_closed: boolean | null
  opened_at: number | string | null
  closed_at: number | string | null
  last_slot: number | string | null
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function mapRow(row: DbRow): IndexedPosition {
  return {
    wallet: row.wallet,
    position: row.position,
    pool: row.pool,
    protocol: row.protocol,
    isClosed: Boolean(row.is_closed),
    openedAt: num(row.opened_at),
    closedAt: num(row.closed_at),
    lastSlot: num(row.last_slot),
  }
}

export async function listIndexedPositions(
  supabase: SupabaseClient,
  wallet: string,
  pool?: string,
): Promise<IndexedPosition[]> {
  let query = supabase
    .from(TABLE)
    .select("wallet, position, pool, protocol, is_closed, opened_at, closed_at, last_slot")
    .eq("wallet", wallet)
  if (pool) query = query.eq("pool", pool)
  const { data, error } = await query.order("last_slot", { ascending: false })
  if (error) {
    console.warn("[position-index] read failed:", error.message)
    return []
  }
  return (data ?? []).map((r) => mapRow(r as DbRow))
}

type ExtractedPosition = {
  position?: string
  pool?: string | null
  protocol?: string | null
  is_closed?: boolean
  opened_at?: number | null
  closed_at?: number | null
  first_slot?: number | null
  last_slot?: number | null
}

/**
 * Replay the wallet's transactions through the backend decoder and store every
 * position address it finds.
 */
export async function rebuildPositionIndex(
  supabase: SupabaseClient,
  wallet: string,
  opts: { backendUrl: string; limit: number },
): Promise<{ indexed: number; scanned: number }> {
  const res = await fetch(`${opts.backendUrl}/debug/extract-wallet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet,
      limit: opts.limit,
      concurrency: 4,
      filter_watchlist: false,
    }),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Backend extract failed (${res.status})`)
  }
  const json = (await res.json()) as {
    positions?: ExtractedPosition[]
    summary?: { signatures_scanned?: number }
  }
  const positions = json.positions ?? []
  const now = new Date().toISOString()
  const rows = positions
    .filter((p) => typeof p.position === "string" && p.position)
    .map((p) => ({
      wallet,
      position: p.position as string,
      pool: p.pool ?? null,
      protocol: p.protocol ?? null,
      is_closed: Boolean(p.is_closed),
      opened_at: p.opened_at ?? null,
      closed_at: p.closed_at ?? null,
      first_slot: p.first_slot ?? null,
      last_slot: p.last_slot ?? null,
      source: "extraction",
      updated_at: now,
    }))

  if (rows.length) {
    const { error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: "wallet,position" })
    if (error) {
      console.warn("[position-index] write failed:", error.message)
      throw new Error(
        `Position index write failed: ${error.message} — run migration 20260815090000_meteora_portfolio_cache.sql`,
      )
    }
  }
  return {
    indexed: rows.length,
    scanned: json.summary?.signatures_scanned ?? 0,
  }
}
