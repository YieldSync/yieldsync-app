import { SOL_MINT } from "@/lib/prices/token-prices"
import type { PositionEvent } from "@/lib/meteora/position-events"

const BASE = "https://damm-v2.datapi.meteora.ag"
const TIMEFRAME = "5m"
const PAD_SECONDS = 15 * 60
const MAX_SPAN_SECONDS = 3 * 60 * 60

type Candle = {
  timestamp: number
  close: number
}

type OhlcvResponse = {
  data?: { timestamp?: number; close?: number }[]
  message?: string
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function priceAt(candles: Candle[], ts: number): number | null {
  if (!candles.length) return null
  let best = candles[0]
  let bestDist = Math.abs(best.timestamp - ts)
  for (const c of candles) {
    const dist = Math.abs(c.timestamp - ts)
    if (dist < bestDist) {
      best = c
      bestDist = dist
    }
  }
  return best.close > 0 ? best.close : null
}

function mergeWindows(times: number[]): [number, number][] {
  const sorted = [...new Set(times.filter((t) => t > 0))].sort((a, b) => a - b)
  const ranges: [number, number][] = []
  for (const t of sorted) {
    const start = t - PAD_SECONDS
    const end = t + PAD_SECONDS
    const last = ranges[ranges.length - 1]
    if (last && start <= last[1] + PAD_SECONDS && end - last[0] <= MAX_SPAN_SECONDS) {
      last[1] = Math.max(last[1], end)
    } else {
      ranges.push([start, end])
    }
  }
  return ranges
}

async function fetchOhlcv(
  pool: string,
  start: number,
  end: number,
): Promise<Candle[]> {
  const url = `${BASE}/pools/${encodeURIComponent(pool)}/ohlcv?timeframe=${TIMEFRAME}&start_time=${start}&end_time=${end}`
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "YieldSync/1.0" },
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = (await res.json()) as OhlcvResponse
  if (!Array.isArray(json.data)) return []
  return json.data
    .map((c) => ({
      timestamp: num(c.timestamp) ?? 0,
      close: num(c.close) ?? 0,
    }))
    .filter((c) => c.timestamp > 0 && c.close > 0)
}

/**
 * DAMM v2 OHLCV close is token X priced in token Y. Value the event in SOL
 * when one side is wSOL; USD is filled separately by the caller.
 */
export async function enrichDammEventsWithOhlcv(
  events: PositionEvent[],
  opts: { mintX?: string | null; mintY?: string | null } = {},
): Promise<PositionEvent[]> {
  const byPool = new Map<string, PositionEvent[]>()
  for (const e of events) {
    if (!e.pool) continue
    const list = byPool.get(e.pool) ?? []
    list.push(e)
    byPool.set(e.pool, list)
  }
  if (!byPool.size) return events

  const prices = new Map<string, Candle[]>()
  await Promise.all(
    [...byPool.entries()].map(async ([pool, rows]) => {
      const times = rows
        .map((e) => e.blockTime)
        .filter((t): t is number => t != null && t > 0)
      const candles: Candle[] = []
      for (const [start, end] of mergeWindows(times)) {
        candles.push(...(await fetchOhlcv(pool, start, end)))
      }
      prices.set(pool, candles)
    }),
  )

  const mintX = opts.mintX ?? null
  const mintY = opts.mintY ?? null

  return events.map((e) => {
    if (!e.pool) return e
    const ts = e.blockTime
    if (ts == null) return e
    const px = priceAt(prices.get(e.pool) ?? [], ts)
    if (px == null) return e
    const x = e.amountX ?? 0
    const y = e.amountY ?? 0
    let totalSol: number | null = null
    if (mintY === SOL_MINT) totalSol = y + x * px
    else if (mintX === SOL_MINT) totalSol = x + (px > 0 ? y / px : 0)
    return { ...e, priceXy: px, totalSol }
  })
}
