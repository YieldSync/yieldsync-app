import {
  bucketTimestamp,
  priceKey,
  type PriceKey,
  type PriceRequest,
} from "@/lib/prices/token-prices"

/** Route cap per request; larger sets are split across calls. */
const CHUNK = 400

export type PriceMap = Record<PriceKey, number>

export function lookupPrice(
  prices: PriceMap,
  mint: string,
  seconds: number,
): number | null {
  const value = prices[priceKey(mint, bucketTimestamp(seconds))]
  return typeof value === "number" && value > 0 ? value : null
}

/**
 * Resolve historical USD prices through our cache-backed route. Chunks are
 * awaited one after another and reported via `onChunk`, so the UI can fill in
 * values while later chunks are still in flight.
 */
export async function fetchPricesAt(
  requests: PriceRequest[],
  opts: {
    signal?: AbortSignal
    onChunk?: (prices: PriceMap) => void
  } = {},
): Promise<PriceMap> {
  const unique = new Map<PriceKey, PriceRequest>()
  for (const r of requests) {
    const ts = bucketTimestamp(r.ts)
    unique.set(priceKey(r.mint, ts), { mint: r.mint, ts })
  }
  const items = [...unique.values()]
  const all: PriceMap = {}

  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK)
    const res = await fetch("/api/prices/at", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: chunk.map((c) => ({ mint: c.mint, timestamp: c.ts })),
      }),
      cache: "no-store",
      signal: opts.signal,
    })
    const json = (await res.json().catch(() => null)) as
      | { prices?: PriceMap; error?: string }
      | null
    if (!res.ok) {
      throw new Error(json?.error || `Price lookup failed (${res.status})`)
    }
    Object.assign(all, json?.prices ?? {})
    opts.onChunk?.(json?.prices ?? {})
  }
  return all
}
