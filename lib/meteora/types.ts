/** Meteora protocols we surface positions for. */
export type PositionProtocol = "dlmm" | "damm2"

export const PROTOCOL_LABEL: Record<PositionProtocol, string> = {
  dlmm: "DLMM",
  damm2: "DAMM V2",
}

export type PositionToken = {
  mint: string | null
  symbol: string | null
  icon: string | null
  decimals: number | null
}

/** One position, normalised across DLMM and DAMM v2. */
export type WalletPosition = {
  protocol: PositionProtocol
  position: string
  pool: string
  poolName: string | null
  tokenX: PositionToken
  tokenY: PositionToken
  binStep: number | null
  baseFee: number | null
  isClosed: boolean
  isOutOfRange: boolean | null
  createdAt: number | null
  closedAt: number | null
  updatedAt: number | null
  lowerBinId: number | null
  upperBinId: number | null
  minPrice: number | null
  maxPrice: number | null
  poolActivePrice: number | null
  feePerTvl24h: number | null
  /** Heuristic label: Spot, BidAsk, Concentrated. */
  strategy: string | null
  /** All-time deposits, in SOL and per token. */
  investedSol: number | null
  investedUsd: number | null
  investedX: number | null
  investedY: number | null
  withdrawnSol: number | null
  /** Claimed fees. */
  feeSol: number | null
  feeUsd: number | null
  feeX: number | null
  feeY: number | null
  /** Open positions only. */
  balanceSol: number | null
  balanceUsd: number | null
  unclaimedFeeSol: number | null
  unclaimedFeeUsd: number | null
  pnlSol: number | null
  pnlUsd: number | null
  pnlPct: number | null
}

/** Wallet-level aggregates, summed across protocols. */
export type WalletStats = {
  netWorthSol: number | null
  openValueSol: number | null
  unclaimedFeeSol: number | null
  openPnlSol: number | null
  closedPositions: number
  openPositions: number
  realisedPnlSol: number | null
  realisedPnlPct: number | null
  /** Derived from the positions we have cached, not from the whole history. */
  sampled: {
    positions: number
    winRate: number | null
    avgInvestedSol: number | null
    feeEarnedSol: number | null
    pnlSol: number | null
    /** Average profit per 30 days over the sampled window. */
    avgMonthlyPnlSol: number | null
    /** Mean PnL per position — LP Agent calls this expected value. */
    expectedValueSol: number | null
  }
}

export function num(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : ""
  return s ? s : null
}

/** Position age in seconds — until close, or until now while open. */
export function positionAgeSeconds(p: WalletPosition): number | null {
  if (!p.createdAt) return null
  const end = p.isClosed ? p.closedAt ?? p.updatedAt : Math.floor(Date.now() / 1000)
  if (!end || end <= p.createdAt) return null
  return end - p.createdAt
}

/**
 * Daily percentage rate: the position's PnL percentage extrapolated to 24h,
 * which is how LP Agent reports DPR.
 */
export function positionDpr(p: WalletPosition): number | null {
  const age = positionAgeSeconds(p)
  if (!age || p.pnlPct == null) return null
  const hours = age / 3600
  if (hours <= 0) return null
  return (p.pnlPct * 24) / hours
}
