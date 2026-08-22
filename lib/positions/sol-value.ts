import type { CachedDlmmPool } from "@/lib/pools/meteora-cache"
import { lookupPrice, type PriceMap } from "@/lib/prices/client"
import { SOL_MINT, type PriceRequest } from "@/lib/prices/token-prices"
import { toUiAmount, type PositionFlows } from "@/lib/positions/flows"

/** Kinds that move value in or out of a position. */
const VALUED_KINDS = new Set(["add", "remove", "claim_fee"])

type Side = { raw: bigint; mint: string | null; decimals: number | null }

function sides(
  event: { amountX: bigint; amountY: bigint },
  pool?: CachedDlmmPool,
): Side[] {
  return [
    {
      raw: event.amountX,
      mint: pool?.tokenX.address ?? null,
      decimals: pool?.tokenX.decimals ?? null,
    },
    {
      raw: event.amountY,
      mint: pool?.tokenY.address ?? null,
      decimals: pool?.tokenY.decimals ?? null,
    },
  ]
}

/**
 * Every (mint, timestamp) price this position needs to be valued in SOL. A SOL
 * side needs no price; any other token needs both its own and the SOL price of
 * that moment, since Mobula quotes in USD.
 */
export function priceRequestsForFlows(
  flows: PositionFlows,
  pool?: CachedDlmmPool,
): PriceRequest[] {
  if (!pool) return []
  const out: PriceRequest[] = []
  for (const event of flows.events) {
    if (!VALUED_KINDS.has(event.kind) || event.blockTime == null) continue
    for (const side of sides(event, pool)) {
      if (side.raw === 0n || !side.mint || side.mint === SOL_MINT) continue
      out.push({ mint: side.mint, ts: event.blockTime })
      out.push({ mint: SOL_MINT, ts: event.blockTime })
    }
  }
  return out
}

export type SolMetrics = {
  investedSol: number
  withdrawnSol: number
  feesSol: number
  pnlSol: number
  /** Flow amounts we could value at their own block time. */
  pricedSides: number
  /** Amounts left out because no price was available for that moment. */
  unpricedSides: number
}

function sideValueSol(
  side: Side,
  seconds: number,
  prices: PriceMap,
): number | null {
  if (side.raw === 0n) return 0
  if (!side.mint) return null
  if (side.mint === SOL_MINT) return toUiAmount(side.raw, side.decimals ?? 9)
  if (side.decimals == null) return null
  const tokenUsd = lookupPrice(prices, side.mint, seconds)
  const solUsd = lookupPrice(prices, SOL_MINT, seconds)
  if (tokenUsd == null || solUsd == null) return null
  return (toUiAmount(side.raw, side.decimals) * tokenUsd) / solUsd
}

/**
 * Value a position's flows in SOL, each amount at the price of its own block
 * time. Returns null when nothing could be valued at all.
 */
export function solMetricsForFlows(
  flows: PositionFlows,
  pool: CachedDlmmPool | undefined,
  prices: PriceMap,
): SolMetrics | null {
  let invested = 0
  let withdrawn = 0
  let fees = 0
  let pricedSides = 0
  let unpricedSides = 0

  for (const event of flows.events) {
    if (!VALUED_KINDS.has(event.kind)) continue
    for (const side of sides(event, pool)) {
      if (side.raw === 0n) continue
      const value =
        event.blockTime == null
          ? null
          : sideValueSol(side, event.blockTime, prices)
      if (value == null) {
        unpricedSides += 1
        continue
      }
      pricedSides += 1
      if (event.kind === "add") invested += value
      else if (event.kind === "remove") withdrawn += value
      else fees += value
    }
  }

  if (pricedSides === 0) return null
  return {
    investedSol: invested,
    withdrawnSol: withdrawn,
    feesSol: fees,
    pnlSol: withdrawn + fees - invested,
    pricedSides,
    unpricedSides,
  }
}

export function formatSol(value: number, opts: { signed?: boolean } = {}) {
  if (!Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  const digits = abs === 0 ? 2 : abs < 0.001 ? 6 : abs < 1 ? 4 : 3
  const text = abs.toLocaleString("en-US", { maximumFractionDigits: digits })
  const sign = opts.signed && value !== 0 ? (value > 0 ? "+" : "−") : ""
  return `${sign}${text} SOL`
}
