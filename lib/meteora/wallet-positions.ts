import type { SupabaseClient } from "@supabase/supabase-js"
import {
  loadPoolRows,
  type PortfolioMode,
  type PortfolioPoolRow,
} from "@/lib/meteora/portfolio"
import { loadPoolPositions, type PoolPosition } from "@/lib/meteora/pool-positions"
import {
  fetchDammClosedPositions,
  fetchDammOpenPositions,
  fetchDammTotals,
} from "@/lib/meteora/damm-v2"
import type { PositionProtocol, WalletPosition } from "@/lib/meteora/types"

/** Parallel pool lookups — enough to be quick, gentle enough on the API. */
const POOL_CONCURRENCY = 6
/** Pools per round; each round checks whether the window is already covered. */
const POOL_BATCH = 12
/** Hard stop so a wallet with hundreds of pools cannot stall a request. */
const MAX_POOLS_PER_REQUEST = 60

export type ProtocolFilter = "all" | PositionProtocol

export type WalletPositionsSlice = {
  wallet: string
  mode: PortfolioMode
  protocol: ProtocolFilter
  page: number
  pageSize: number
  rows: WalletPosition[]
  /** Total the APIs report for the wallet, used for the page count. */
  totalPositions: number
  loadedPositions: number
  poolsScanned: number
  totalPools: number
  /** False when deeper pages still need more pools pulled in. */
  complete: boolean
  /** Set when one protocol failed but the other still returned rows. */
  warning: string | null
}

/** Closed positions sort by their close, open ones by when they started. */
function sortKey(p: WalletPosition) {
  return p.closedAt ?? p.updatedAt ?? p.createdAt ?? 0
}

function normaliseDlmm(
  position: PoolPosition,
  pool: PortfolioPoolRow,
): WalletPosition {
  return {
    protocol: "dlmm",
    position: position.position,
    pool: position.pool,
    poolName:
      pool.tokenX.symbol && pool.tokenY.symbol
        ? `${pool.tokenX.symbol}-${pool.tokenY.symbol}`
        : null,
    tokenX: { ...pool.tokenX, decimals: null },
    tokenY: { ...pool.tokenY, decimals: null },
    binStep: pool.binStep,
    baseFee: pool.baseFee,
    isClosed: position.isClosed,
    isOutOfRange: position.isOutOfRange,
    createdAt: position.createdAt,
    closedAt: position.closedAt,
    updatedAt: position.updatedAt,
    lowerBinId: position.lowerBinId,
    upperBinId: position.upperBinId,
    minPrice: position.minPrice,
    maxPrice: position.maxPrice,
    poolActivePrice: position.poolActivePrice,
    feePerTvl24h: position.feePerTvl24h ?? pool.feePerTvl24h,
    strategy:
      position.lowerBinId != null && position.upperBinId != null
        ? position.lowerBinId === position.upperBinId
          ? "Spot"
          : "BidAsk"
        : null,
    investedSol: position.depositSol,
    investedUsd:
      position.depositX.usd == null && position.depositY.usd == null
        ? null
        : (position.depositX.usd ?? 0) + (position.depositY.usd ?? 0),
    investedX: position.depositX.amount,
    investedY: position.depositY.amount,
    withdrawnSol: position.withdrawSol,
    feeSol: position.feeSol,
    feeUsd:
      position.feeX.usd == null && position.feeY.usd == null
        ? null
        : (position.feeX.usd ?? 0) + (position.feeY.usd ?? 0),
    feeX: position.feeX.amount,
    feeY: position.feeY.amount,
    balanceSol: position.balanceSol,
    balanceUsd: position.balanceUsd,
    unclaimedFeeSol: position.unclaimedFeeSol,
    unclaimedFeeUsd: position.unclaimedFeeUsd,
    pnlSol: position.pnlSol,
    pnlUsd: position.pnlUsd,
    pnlPct: position.pnlSolPct,
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next
      next += 1
      if (i >= items.length) return
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

type DlmmResult = {
  positions: WalletPosition[]
  poolsScanned: number
  totalPools: number
  totalPositions: number
  complete: boolean
}

/**
 * DLMM only aggregates per pool, so we walk pools in upstream order (newest
 * activity first) and pull their positions. Because that order is by last
 * activity, once pools 1..k are loaded every position newer than pool k's last
 * activity is final — exactly the prefix the UI shows.
 */
async function loadDlmmPositions(
  supabase: SupabaseClient,
  opts: {
    wallet: string
    mode: PortfolioMode
    neededRows: number
    refresh?: boolean
  },
): Promise<DlmmResult> {
  const { wallet, mode, neededRows, refresh } = opts
  let poolBudget = POOL_BATCH
  let pools: PortfolioPoolRow[] = []
  let poolsExhausted = false
  let totalPools = 0
  let totalPositions = 0
  const collected = new Map<string, WalletPosition>()
  let scanned = 0

  while (scanned < MAX_POOLS_PER_REQUEST) {
    if (pools.length < poolBudget && !poolsExhausted) {
      const result = await loadPoolRows(supabase, {
        wallet,
        mode,
        minRows: poolBudget,
        refresh: refresh && scanned === 0,
      })
      pools = result.rows
      poolsExhausted = result.exhausted
      totalPools = result.totals.totalCount
      totalPositions = result.totals.totalPositions
    }

    const batch = pools.slice(scanned, scanned + POOL_BATCH)
    if (!batch.length) break

    const results = await mapLimit(batch, POOL_CONCURRENCY, async (row) => {
      try {
        const { positions } = await loadPoolPositions(supabase, row.pool, wallet, {
          refresh: refresh && mode === "open",
        })
        return { row, positions }
      } catch (err) {
        console.warn("[wallet-positions] pool failed", row.pool, err)
        return { row, positions: [] as PoolPosition[] }
      }
    })

    for (const { row, positions } of results) {
      for (const position of positions) {
        // Open and history are the same upstream rows, split by state.
        if (mode === "open" && position.isClosed) continue
        if (mode === "closed" && !position.isClosed) continue
        collected.set(position.position, normaliseDlmm(position, row))
      }
    }
    scanned += batch.length

    // Anything above the last scanned pool's boundary is final; below it a pool
    // we have not pulled yet could still displace a row.
    const boundary = pools[scanned - 1]?.lastClosedAt ?? null
    const settled =
      boundary == null
        ? collected.size
        : [...collected.values()].filter((p) => sortKey(p) >= boundary).length
    if (settled >= neededRows) break

    if (scanned >= pools.length) {
      if (poolsExhausted) break
      poolBudget = pools.length + POOL_BATCH
    }
  }

  return {
    positions: [...collected.values()],
    poolsScanned: scanned,
    totalPools,
    totalPositions,
    complete: poolsExhausted && scanned >= pools.length,
  }
}

/** A chronological page of individual positions across both protocols. */
export async function loadWalletPositions(
  supabase: SupabaseClient,
  opts: {
    wallet: string
    mode: PortfolioMode
    protocol: ProtocolFilter
    page: number
    pageSize: number
    prefetchPages: number
    refresh?: boolean
  },
): Promise<WalletPositionsSlice> {
  const { wallet, mode, protocol, page, pageSize, prefetchPages, refresh } = opts
  const firstRow = (page - 1) * pageSize
  const neededRows = firstRow + pageSize * Math.max(1, prefetchPages)
  const warnings: string[] = []

  const wantDlmm = protocol === "all" || protocol === "dlmm"
  const wantDamm = protocol === "all" || protocol === "damm2"

  const dlmmP: Promise<DlmmResult> = wantDlmm
    ? loadDlmmPositions(supabase, { wallet, mode, neededRows, refresh })
    : Promise.resolve({
        positions: [],
        poolsScanned: 0,
        totalPools: 0,
        totalPositions: 0,
        complete: true,
      })

  type DammResult = {
    positions: WalletPosition[]
    complete: boolean
    total: number
  }

  const dammP: Promise<DammResult> = wantDamm
    ? (mode === "open"
        ? fetchDammOpenPositions(wallet).then((r) => ({
            positions: r.positions.filter((p) => !p.isClosed),
            complete: true,
            total: r.totalPositions,
          }))
        : Promise.all([
            fetchDammClosedPositions(wallet, { minRows: neededRows }),
            fetchDammTotals(wallet).catch(() => ({ closedPositions: 0 })),
          ]).then(([closed, totals]) => ({
            positions: closed.positions,
            complete: closed.nextCursor == null,
            total: Math.max(totals.closedPositions, closed.positions.length),
          }))
      ).catch((err: unknown) => {
        warnings.push(
          err instanceof Error ? `DAMM v2: ${err.message}` : "DAMM v2 failed",
        )
        return { positions: [] as WalletPosition[], complete: false, total: 0 }
      })
    : Promise.resolve({ positions: [], complete: true, total: 0 })

  const [dlmm, damm] = await Promise.all([dlmmP, dammP])

  const merged = [...dlmm.positions, ...damm.positions].sort(
    (a, b) => sortKey(b) - sortKey(a),
  )

  return {
    wallet,
    mode,
    protocol,
    page,
    pageSize,
    rows: merged.slice(firstRow, firstRow + pageSize),
    totalPositions: dlmm.totalPositions + damm.total,
    loadedPositions: merged.length,
    poolsScanned: dlmm.poolsScanned,
    totalPools: dlmm.totalPools,
    complete: dlmm.complete && damm.complete,
    warning: warnings.length ? warnings.join(" · ") : null,
  }
}
