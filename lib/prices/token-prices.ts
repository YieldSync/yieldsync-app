import type { SupabaseClient } from "@supabase/supabase-js"
import { withMigrationHint } from "@/lib/supabase/errors"

const TABLE = "token_price_snapshots"
const MIGRATION = "20260813210000_token_price_snapshots.sql"
const MOBULA_URL = "https://api.mobula.io/api/2/token/price-at"
const CHAIN_ID = "solana:solana"

export const SOL_MINT = "So11111111111111111111111111111111111111112"

/**
 * Prices are bucketed so that several events inside the same minute share one
 * upstream call. Positions live minutes, so a finer grid would multiply calls
 * without changing the SOL valuation in any meaningful way.
 */
export const PRICE_BUCKET_SECONDS = 60

/** Mobula allows 50 requests/second; stay clearly below it. */
const FETCH_CONCURRENCY = 8

export type PriceKey = `${string}:${number}`

export function bucketTimestamp(seconds: number) {
  return Math.floor(seconds / PRICE_BUCKET_SECONDS) * PRICE_BUCKET_SECONDS
}

export function priceKey(mint: string, ts: number): PriceKey {
  return `${mint}:${ts}`
}

export type PriceRequest = { mint: string; ts: number }

type DbRow = {
  mint: string
  ts: number | string
  price_usd: number | string
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/** Per-instance cache so repeat requests skip both Supabase and Mobula. */
const memory = new Map<PriceKey, number>()
const MEMORY_LIMIT = 50_000

function remember(key: PriceKey, price: number) {
  if (memory.size >= MEMORY_LIMIT) memory.clear()
  memory.set(key, price)
}

async function readCache(
  supabase: SupabaseClient,
  requests: PriceRequest[],
): Promise<Map<PriceKey, number>> {
  const out = new Map<PriceKey, number>()
  const misses: PriceRequest[] = []
  for (const r of requests) {
    const key = priceKey(r.mint, r.ts)
    const hit = memory.get(key)
    if (hit != null) out.set(key, hit)
    else misses.push(r)
  }
  if (!misses.length) return out

  const mints = [...new Set(misses.map((r) => r.mint))]
  const timestamps = [...new Set(misses.map((r) => r.ts))]

  const { data, error } = await supabase
    .from(TABLE)
    .select("mint, ts, price_usd")
    .in("mint", mints)
    .in("ts", timestamps)

  if (error) {
    // A missing table or policy must not break pricing — fall back to upstream.
    console.warn(
      "[prices]",
      withMigrationHint(error.message || "price cache read failed", MIGRATION),
    )
    return out
  }
  for (const row of (data ?? []) as DbRow[]) {
    const ts = toNumber(row.ts)
    const price = toNumber(row.price_usd)
    if (ts == null || price == null) continue
    const key = priceKey(row.mint, ts)
    remember(key, price)
    out.set(key, price)
  }
  return out
}

type MobulaPrice = {
  priceUsd: number
  symbol: string | null
  swapTs: number | null
}

async function fetchMobulaPrice(
  apiKey: string,
  mint: string,
  ts: number,
): Promise<MobulaPrice | null> {
  const url = `${MOBULA_URL}?chainId=${encodeURIComponent(
    CHAIN_ID,
  )}&address=${encodeURIComponent(mint)}&timestamp=${ts}`
  const res = await fetch(url, {
    headers: { Authorization: apiKey, accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Mobula price-at failed (${res.status})`)
  }
  const json = (await res.json()) as {
    data?: { priceUSD?: number; symbol?: string; swapTimestamp?: number }
  }
  const price = toNumber(json.data?.priceUSD)
  if (price == null || price <= 0) return null
  const swap = toNumber(json.data?.swapTimestamp)
  return {
    priceUsd: price,
    symbol: json.data?.symbol ?? null,
    swapTs: swap == null ? null : Math.floor(swap / 1000),
  }
}

/**
 * Resolve USD prices for (mint, timestamp) pairs, cache-first. Timestamps must
 * already be bucketed; unknown pairs are fetched from Mobula and persisted.
 */
export async function resolvePrices(
  supabase: SupabaseClient,
  requests: PriceRequest[],
): Promise<{ prices: Record<PriceKey, number>; fetched: number; missing: number }> {
  const unique = new Map<PriceKey, PriceRequest>()
  for (const r of requests) {
    const mint = r.mint.trim()
    if (!mint || !Number.isFinite(r.ts)) continue
    unique.set(priceKey(mint, r.ts), { mint, ts: r.ts })
  }
  const wanted = [...unique.values()]
  const cached = await readCache(supabase, wanted)
  const need = wanted.filter((r) => !cached.has(priceKey(r.mint, r.ts)))

  const apiKey = process.env.MOBULA_API_KEY?.trim()
  if (!apiKey) {
    if (need.length) {
      throw new Error("MOBULA_API_KEY is not configured")
    }
    return {
      prices: Object.fromEntries(cached) as Record<PriceKey, number>,
      fetched: 0,
      missing: 0,
    }
  }

  const rows: {
    mint: string
    ts: number
    price_usd: number
    symbol: string | null
    swap_ts: number | null
    source: string
  }[] = []
  let missing = 0

  for (let i = 0; i < need.length; i += FETCH_CONCURRENCY) {
    const chunk = need.slice(i, i + FETCH_CONCURRENCY)
    await Promise.all(
      chunk.map(async (r) => {
        try {
          const price = await fetchMobulaPrice(apiKey, r.mint, r.ts)
          if (!price) {
            missing += 1
            return
          }
          const key = priceKey(r.mint, r.ts)
          cached.set(key, price.priceUsd)
          remember(key, price.priceUsd)
          rows.push({
            mint: r.mint,
            ts: r.ts,
            price_usd: price.priceUsd,
            symbol: price.symbol,
            swap_ts: price.swapTs,
            source: "mobula",
          })
        } catch (err) {
          missing += 1
          console.warn("[prices] mobula failed", r.mint, r.ts, err)
        }
      }),
    )
  }

  if (rows.length) {
    const { error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: "mint,ts" })
    if (error) {
      console.warn("[prices] cache write failed", error.message)
    }
  }

  return {
    prices: Object.fromEntries(cached) as Record<PriceKey, number>,
    fetched: rows.length,
    missing,
  }
}
