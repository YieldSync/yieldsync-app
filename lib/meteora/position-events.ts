import type { SupabaseClient } from "@supabase/supabase-js"
import { enrichDammEventsWithOhlcv } from "@/lib/meteora/ohlcv"
import type { PositionProtocol } from "@/lib/meteora/types"
import {
  bucketTimestamp,
  priceKey,
  resolvePrices,
  SOL_MINT,
} from "@/lib/prices/token-prices"

const BASE = "https://dlmm.datapi.meteora.ag"
const TABLE = "meteora_position_events"

/** Events of a closed position never change; open ones can still grow. */
const TTL_MS = 5 * 60_000

export type PositionEvent = {
  position: string
  signature: string
  ixIndex: number
  eventType: string
  /** Where the row came from — Meteora's index or our own decoder. */
  source?: "meteora" | "yieldsync"
  pool: string | null
  userAddress: string | null
  /** Unix seconds (upstream reports milliseconds). */
  blockTime: number | null
  slot: number | null
  tokenX: string | null
  tokenY: string | null
  amountX: number | null
  amountY: number | null
  amountXUsd: number | null
  amountYUsd: number | null
  totalUsd: number | null
  /** Token X priced in token Y, from DAMM v2 OHLCV. */
  priceXy?: number | null
  /** Both sides valued in SOL when one mint is wSOL. */
  totalSol?: number | null
}

const HIDDEN_EVENT_TYPES = new Set([
  "open",
  "close",
  "open_position",
  "close_position",
  "create_position",
  "initialize_position",
  "position_create",
  "position_close",
  "composition_fee",
])

export function normalizeEventType(raw: string): string {
  const s = raw.toLowerCase().replace(/[\s-]+/g, "_")
  if (s.includes("claim_reward") || s.includes("claimreward")) return "claim_reward"
  if (s.includes("claim")) return "claim_fee"
  if (s.includes("remove") || s.includes("withdraw")) return "remove"
  if (s.includes("add") || s.includes("deposit")) return "add"
  if (s.includes("open") || s.includes("create") || s.includes("initialize")) {
    return "open"
  }
  if (s.includes("close")) return "close"
  return s
}

function isHistoryEvent(eventType: string) {
  return !HIDDEN_EVENT_TYPES.has(normalizeEventType(eventType))
}

/** Newest first; inside one tx, remove is always last. */
export function sortPositionEvents(events: PositionEvent[]): PositionEvent[] {
  return [...events].sort((a, b) => {
    const tb = b.blockTime ?? 0
    const ta = a.blockTime ?? 0
    if (tb !== ta) return tb - ta
    if (a.signature !== b.signature) return a.signature.localeCompare(b.signature)
    const ra = normalizeEventType(a.eventType) === "remove" ? 1 : 0
    const rb = normalizeEventType(b.eventType) === "remove" ? 1 : 0
    if (ra !== rb) return ra - rb
    return a.ixIndex - b.ixIndex
  })
}

export function presentPositionEvents(events: PositionEvent[]): PositionEvent[] {
  return sortPositionEvents(
    events
      .map((e) => ({ ...e, eventType: normalizeEventType(e.eventType) }))
      .filter((e) => isHistoryEvent(e.eventType)),
  )
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s ? s : null
}

export async function fetchPositionEvents(
  position: string,
): Promise<PositionEvent[]> {
  const res = await fetch(
    `${BASE}/positions/${encodeURIComponent(position)}/historical`,
    {
      headers: { accept: "application/json", "user-agent": "YieldSync/1.0" },
      cache: "no-store",
    },
  )
  if (!res.ok) {
    throw new Error(`Meteora position history failed (${res.status})`)
  }
  const json = (await res.json()) as { events?: Record<string, unknown>[] }
  return (json.events ?? [])
    .map((e) => {
      const ms = num(e.blockTime)
      return {
        position: str(e.positionAddress) ?? position,
        signature: str(e.signature) ?? "",
        ixIndex: num(e.ixIndex) ?? 0,
        eventType: normalizeEventType(str(e.eventType) ?? "unknown"),
        pool: str(e.poolAddress),
        userAddress: str(e.userAddress),
        blockTime: ms == null ? null : Math.floor(ms / 1000),
        slot: num(e.slot),
        tokenX: str(e.tokenX),
        tokenY: str(e.tokenY),
        amountX: num(e.amountX),
        amountY: num(e.amountY),
        amountXUsd: num(e.amountXUsd),
        amountYUsd: num(e.amountYUsd),
        totalUsd: num(e.totalUsd),
      }
    })
    .filter((e) => e.signature)
}

type DbRow = {
  position: string
  signature: string
  ix_index: number
  event_type: string
  pool: string | null
  user_address: string | null
  block_time: number | string | null
  slot: number | string | null
  token_x: string | null
  token_y: string | null
  amount_x: number | string | null
  amount_y: number | string | null
  amount_x_usd: number | string | null
  amount_y_usd: number | string | null
  total_usd: number | string | null
  fetched_at: string
}

function mapDbRow(row: DbRow): PositionEvent {
  return {
    position: row.position,
    signature: row.signature,
    ixIndex: row.ix_index,
    eventType: normalizeEventType(row.event_type),
    pool: row.pool,
    userAddress: row.user_address,
    blockTime: num(row.block_time),
    slot: num(row.slot),
    tokenX: row.token_x,
    tokenY: row.token_y,
    amountX: num(row.amount_x),
    amountY: num(row.amount_y),
    amountXUsd: num(row.amount_x_usd),
    amountYUsd: num(row.amount_y_usd),
    totalUsd: num(row.total_usd),
  }
}

const BACKEND_EVENT_KIND: Record<string, string> = {
  open: "open",
  close: "close",
  add: "add",
  remove: "remove",
  claim_fee: "claim_fee",
  claim_reward: "claim_reward",
}

type BackendEvent = {
  kind?: string
  signature?: string
  ix_index?: number
  slot?: number
  block_time?: number
  pool?: string
  position?: string
  owner?: string
  amount_x?: string
  amount_y?: string
}

function scaled(raw: string | undefined, decimals: number | null) {
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  const d = decimals ?? 0
  return d > 0 ? n / 10 ** d : n
}

/**
 * DAMM v2 has no event endpoint upstream, so we replay the position account's
 * own signatures through our decoder. A position touches only a handful of
 * transactions, which keeps this cheap.
 */
export async function fetchBackendPositionEvents(
  position: string,
  opts: { backendUrl: string; decimalsX?: number | null; decimalsY?: number | null },
): Promise<PositionEvent[]> {
  const res = await fetch(`${opts.backendUrl}/debug/extract-wallet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet: position,
      limit: 200,
      concurrency: 4,
      filter_watchlist: false,
      include_events: true,
    }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Backend extract failed (${res.status})`)
  const json = (await res.json()) as {
    positions?: { position?: string; pool?: string; events?: BackendEvent[] }[]
  }
  const events: PositionEvent[] = []
  for (const p of json.positions ?? []) {
    for (const e of p.events ?? []) {
      if (!e.signature) continue
      const attributed = e.position ?? p.position
      if (attributed && attributed !== position) continue
      events.push({
        position,
        signature: e.signature,
        ixIndex: e.ix_index ?? 0,
        eventType: normalizeEventType(
          BACKEND_EVENT_KIND[e.kind ?? ""] ?? e.kind ?? "unknown",
        ),
        source: "yieldsync",
        pool: e.pool ?? p.pool ?? null,
        userAddress: e.owner ?? null,
        blockTime: e.block_time ?? null,
        slot: e.slot ?? null,
        tokenX: null,
        tokenY: null,
        amountX: scaled(e.amount_x, opts.decimalsX ?? null),
        amountY: scaled(e.amount_y, opts.decimalsY ?? null),
        amountXUsd: null,
        amountYUsd: null,
        totalUsd: null,
      })
    }
  }
  return presentPositionEvents(events)
}

/**
 * Events for one position, cache-first. Only called when a row is expanded, so
 * a wallet with hundreds of positions costs nothing until someone looks.
 */
export async function loadPositionEvents(
  supabase: SupabaseClient,
  position: string,
  opts: {
    refresh?: boolean
    protocol?: PositionProtocol
    backendUrl?: string
    decimalsX?: number | null
    decimalsY?: number | null
    mintX?: string | null
    mintY?: string | null
  } = {},
): Promise<{ events: PositionEvent[]; cached: boolean }> {
  if (!opts.refresh) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("position", position)
      .order("block_time", { ascending: false })
    if (error) {
      console.warn("[position-events] cache unavailable:", error.message)
    } else if (data && data.length) {
      const rows = data as DbRow[]
      const newest = Math.max(
        ...rows.map((r) => Date.parse(r.fetched_at)).filter(Number.isFinite),
      )
      if (Number.isFinite(newest) && Date.now() - newest < TTL_MS) {
        const presented = presentPositionEvents(rows.map(mapDbRow))
        const rawTypes = new Set(
          rows.map((r) => normalizeEventType(r.event_type)),
        )
        const staleDamm =
          opts.protocol === "damm2" &&
          (rawTypes.has("open") || rawTypes.has("close")) &&
          !presented.some(
            (e) => e.eventType === "add" || e.eventType === "remove",
          )
        if (!staleDamm) {
          return {
            events: await finalizeEvents(supabase, presented, opts),
            cached: true,
          }
        }
      }
    }
  }

  const useBackend = opts.protocol === "damm2" && Boolean(opts.backendUrl)
  let events = useBackend
    ? await fetchBackendPositionEvents(position, {
        backendUrl: opts.backendUrl as string,
        decimalsX: opts.decimalsX,
        decimalsY: opts.decimalsY,
      })
    : presentPositionEvents(await fetchPositionEvents(position))

  // DLMM history can lag behind the chain; our own decoder fills the gap.
  if (!events.length && !useBackend && opts.backendUrl) {
    try {
      events = await fetchBackendPositionEvents(position, {
        backendUrl: opts.backendUrl,
        decimalsX: opts.decimalsX,
        decimalsY: opts.decimalsY,
      })
    } catch (err) {
      console.warn("[position-events] backend fallback failed:", err)
    }
  }

  events = await finalizeEvents(supabase, presentPositionEvents(events), opts)

  if (events.length) {
    const now = new Date().toISOString()
    const { error } = await supabase.from(TABLE).upsert(
      events.map((e) => ({
        position: e.position,
        signature: e.signature,
        ix_index: e.ixIndex,
        event_type: e.eventType,
        pool: e.pool,
        user_address: e.userAddress,
        block_time: e.blockTime,
        slot: e.slot,
        token_x: e.tokenX,
        token_y: e.tokenY,
        amount_x: e.amountX,
        amount_y: e.amountY,
        amount_x_usd: e.amountXUsd,
        amount_y_usd: e.amountYUsd,
        total_usd: e.totalUsd,
        fetched_at: now,
      })),
      { onConflict: "position,signature,ix_index" },
    )
    if (error) {
      console.warn("[position-events] cache write failed:", error.message)
    }
  }
  return { events, cached: false }
}

async function finalizeEvents(
  supabase: SupabaseClient,
  events: PositionEvent[],
  opts: {
    protocol?: PositionProtocol
    mintX?: string | null
    mintY?: string | null
  },
): Promise<PositionEvent[]> {
  let next = events
  if (opts.protocol === "damm2") {
    next = await enrichDammEventsWithOhlcv(next, {
      mintX: opts.mintX,
      mintY: opts.mintY,
    })
  }
  return applySolUsd(supabase, next, opts)
}

async function applySolUsd(
  supabase: SupabaseClient,
  events: PositionEvent[],
  opts: { mintX?: string | null; mintY?: string | null },
): Promise<PositionEvent[]> {
  const requests = events
    .filter((e) => e.totalSol != null && e.blockTime)
    .map((e) => ({ mint: SOL_MINT, ts: bucketTimestamp(e.blockTime as number) }))
  if (!requests.length) return events
  try {
    const { prices } = await resolvePrices(supabase, requests)
    return events.map((e) => {
      if (e.totalSol == null || e.blockTime == null) return e
      const solUsd = prices[priceKey(SOL_MINT, bucketTimestamp(e.blockTime))]
      if (solUsd == null) return e
      const yIsSol = opts.mintY === SOL_MINT
      const xIsSol = opts.mintX === SOL_MINT
      const solAmount = yIsSol ? e.amountY : xIsSol ? e.amountX : null
      const otherSol =
        solAmount == null ? null : Math.max(0, e.totalSol - solAmount)
      return {
        ...e,
        totalUsd: e.totalSol * solUsd,
        amountYUsd: yIsSol
          ? (e.amountY ?? 0) * solUsd
          : otherSol != null
            ? otherSol * solUsd
            : e.amountYUsd,
        amountXUsd: xIsSol
          ? (e.amountX ?? 0) * solUsd
          : otherSol != null
            ? otherSol * solUsd
            : e.amountXUsd,
      }
    })
  } catch (err) {
    console.warn("[position-events] SOL USD pricing failed:", err)
    return events
  }
}
