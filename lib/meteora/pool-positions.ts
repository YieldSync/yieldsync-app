import type { SupabaseClient } from "@supabase/supabase-js"

const BASE = "https://dlmm.datapi.meteora.ag"
const TABLE = "meteora_wallet_positions"
const SOURCE_PAGE_SIZE = 20
/** A wallet rarely holds more than this many positions in one pool. */
const MAX_PAGES = 5
const TTL_MS = 60_000

/** Amount of one token, as reported in native units, USD and SOL. */
export type TokenAmount = {
  amount: number | null
  usd: number | null
  sol: number | null
}

export type PoolPosition = {
  position: string
  pool: string
  isClosed: boolean
  isOutOfRange: boolean | null
  createdAt: number | null
  closedAt: number | null
  updatedAt: number | null
  lowerBinId: number | null
  upperBinId: number | null
  poolActiveBinId: number | null
  minPrice: number | null
  maxPrice: number | null
  poolActivePrice: number | null
  feePerTvl24h: number | null
  pnlSol: number | null
  pnlUsd: number | null
  pnlSolPct: number | null
  depositX: TokenAmount
  depositY: TokenAmount
  depositSol: number | null
  withdrawX: TokenAmount
  withdrawY: TokenAmount
  withdrawSol: number | null
  feeX: TokenAmount
  feeY: TokenAmount
  feeSol: number | null
  /** Only present while the position is open. */
  balanceSol: number | null
  balanceUsd: number | null
  unclaimedFeeSol: number | null
  unclaimedFeeUsd: number | null
}

export type PoolPositionsResult = {
  pool: string
  wallet: string
  tokenX: string | null
  tokenY: string | null
  positions: PoolPosition[]
  cached: boolean
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

type RawAmount = { amount?: unknown; usd?: unknown; amountSol?: unknown }

function amount(raw: unknown): TokenAmount {
  const r = (raw ?? {}) as RawAmount
  return { amount: num(r.amount), usd: num(r.usd), sol: num(r.amountSol) }
}

function mapPosition(raw: Record<string, unknown>, pool: string): PoolPosition | null {
  const position = str(raw.positionAddress)
  if (!position) return null
  const deposits = (raw.allTimeDeposits ?? {}) as Record<string, unknown>
  const withdrawals = (raw.allTimeWithdrawals ?? {}) as Record<string, unknown>
  const fees = (raw.allTimeFees ?? {}) as Record<string, unknown>
  const unrealized = (raw.unrealizedPnl ?? {}) as Record<string, unknown>
  const total = (side: Record<string, unknown>) =>
    (side.total ?? {}) as { usd?: unknown; sol?: unknown }
  const unclaimedX = amount(unrealized.unclaimedFeeTokenX)
  const unclaimedY = amount(unrealized.unclaimedFeeTokenY)
  const unclaimedSol =
    unclaimedX.sol == null && unclaimedY.sol == null
      ? null
      : (unclaimedX.sol ?? 0) + (unclaimedY.sol ?? 0)
  const unclaimedUsd =
    unclaimedX.usd == null && unclaimedY.usd == null
      ? null
      : (unclaimedX.usd ?? 0) + (unclaimedY.usd ?? 0)

  return {
    position,
    pool,
    isClosed: Boolean(raw.isClosed),
    isOutOfRange:
      typeof raw.isOutOfRange === "boolean" ? raw.isOutOfRange : null,
    createdAt: num(raw.createdAt),
    closedAt: num(raw.closedAt),
    updatedAt: num(raw.updatedAt),
    lowerBinId: num(raw.lowerBinId),
    upperBinId: num(raw.upperBinId),
    poolActiveBinId: num(raw.poolActiveBinId),
    minPrice: num(raw.minPrice),
    maxPrice: num(raw.maxPrice),
    poolActivePrice: num(raw.poolActivePrice),
    feePerTvl24h: num(raw.feePerTvl24h),
    pnlSol: num(raw.pnlSol),
    pnlUsd: num(raw.pnlUsd),
    pnlSolPct: num(raw.pnlSolPctChange),
    depositX: amount(deposits.tokenX),
    depositY: amount(deposits.tokenY),
    depositSol: num(total(deposits).sol),
    withdrawX: amount(withdrawals.tokenX),
    withdrawY: amount(withdrawals.tokenY),
    withdrawSol: num(total(withdrawals).sol),
    feeX: amount(fees.tokenX),
    feeY: amount(fees.tokenY),
    feeSol: num(total(fees).sol),
    balanceSol: num(unrealized.balancesSol),
    balanceUsd: num(unrealized.balances),
    unclaimedFeeSol: unclaimedSol,
    unclaimedFeeUsd: unclaimedUsd,
  }
}

/**
 * Every position the wallet ever held in one pool, including closed ones. This
 * is the only upstream source that reports position addresses for history.
 */
export async function fetchPoolPositions(
  pool: string,
  wallet: string,
  ): Promise<{
  positions: PoolPosition[]
  raws: Record<string, unknown>[]
  tokenX: string | null
  tokenY: string | null
}> {
  const positions: PoolPosition[] = []
  const raws: Record<string, unknown>[] = []
  let tokenX: string | null = null
  let tokenY: string | null = null

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${BASE}/positions/${encodeURIComponent(pool)}/pnl?user=${encodeURIComponent(
      wallet,
    )}&page=${page}`
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "YieldSync/1.0" },
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`Meteora pool positions failed (${res.status})`)
    const json = (await res.json()) as {
      tokenX?: unknown
      tokenY?: unknown
      hasNext?: boolean
      totalCount?: number
      positions?: Record<string, unknown>[]
    }
    tokenX = tokenX ?? str(json.tokenX)
    tokenY = tokenY ?? str(json.tokenY)
    const batch = json.positions ?? []
    for (const raw of batch) {
      const mapped = mapPosition(raw, pool)
      if (mapped) {
        positions.push(mapped)
        raws.push(raw)
      }
    }
    if (!json.hasNext || batch.length < SOURCE_PAGE_SIZE) break
  }

  positions.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  return { positions, raws, tokenX, tokenY }
}

type DbRow = {
  position: string
  pool: string
  raw: Record<string, unknown> | null
  fetched_at: string
}

async function writeCache(
  supabase: SupabaseClient,
  wallet: string,
  pool: string,
  positions: PoolPosition[],
  raws: Record<string, unknown>[],
) {
  if (!positions.length) return
  const now = new Date().toISOString()
  const rows = positions.map((p, i) => ({
    wallet,
    pool,
    position: p.position,
    is_closed: p.isClosed,
    is_out_of_range: p.isOutOfRange,
    created_at: p.createdAt,
    closed_at: p.closedAt,
    updated_at: p.updatedAt,
    lower_bin_id: p.lowerBinId,
    upper_bin_id: p.upperBinId,
    min_price: p.minPrice,
    max_price: p.maxPrice,
    pnl_sol: p.pnlSol,
    pnl_usd: p.pnlUsd,
    pnl_sol_pct: p.pnlSolPct,
    deposit_sol: p.depositSol,
    withdrawal_sol: p.withdrawSol,
    fee_sol: p.feeSol,
    balance_sol: p.balanceSol,
    unclaimed_fee_sol: p.unclaimedFeeSol,
    raw: raws[i] ?? null,
    fetched_at: now,
  }))
  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: "wallet,position" })
  if (error) console.warn("[pool-positions] cache write failed:", error.message)
}

/**
 * Positions for one pool, cache-first. Closed positions never change, so a
 * stale cache only costs freshness on the open ones.
 */
export async function loadPoolPositions(
  supabase: SupabaseClient,
  pool: string,
  wallet: string,
  opts: { refresh?: boolean } = {},
): Promise<PoolPositionsResult> {
  if (!opts.refresh) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("position, pool, raw, fetched_at")
      .eq("wallet", wallet)
      .eq("pool", pool)
    if (error) {
      console.warn("[pool-positions] cache unavailable:", error.message)
    } else if (data && data.length) {
      const rows = data as DbRow[]
      const newest = Math.max(
        ...rows.map((r) => Date.parse(r.fetched_at)).filter(Number.isFinite),
      )
      const anyOpen = rows.some((r) => r.raw && r.raw.isClosed === false)
      const fresh = !anyOpen || Date.now() - newest < TTL_MS
      if (Number.isFinite(newest) && fresh) {
        const positions = rows
          .map((r) => (r.raw ? mapPosition(r.raw, pool) : null))
          .filter((p): p is PoolPosition => p !== null)
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        if (positions.length) {
          return { pool, wallet, tokenX: null, tokenY: null, positions, cached: true }
        }
      }
    }
  }

  const { positions, raws, tokenX, tokenY } = await fetchPoolPositions(pool, wallet)
  await writeCache(supabase, wallet, pool, positions, raws)
  return { pool, wallet, tokenX, tokenY, positions, cached: false }
}
