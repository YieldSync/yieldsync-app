import type { SupabaseClient } from "@supabase/supabase-js"

const BASE = "https://dlmm.datapi.meteora.ag"
const POOLS_TABLE = "meteora_wallet_pools"
const PAGES_TABLE = "meteora_wallet_pages"

/** The API always answers with 20 rows per page, regardless of what we ask. */
export const SOURCE_PAGE_SIZE = 20

/** Open balances move with the market; closed history is settled. */
const TTL_MS: Record<PortfolioMode, number> = {
  open: 60_000,
  closed: 10 * 60_000,
}

export type PortfolioMode = "open" | "closed"

export type PortfolioToken = {
  mint: string | null
  symbol: string | null
  icon: string | null
}

export type PortfolioPoolRow = {
  pool: string
  rank: number
  tokenX: PortfolioToken
  tokenY: PortfolioToken
  binStep: number | null
  baseFee: number | null
  collectFeeMode: number | null
  openPositionCount: number | null
  /** Position addresses — only the open endpoint reports them. */
  listPositions: string[]
  balancesSol: number | null
  balancesUsd: number | null
  unclaimedFeesSol: number | null
  unclaimedFeesUsd: number | null
  totalDepositSol: number | null
  totalDepositUsd: number | null
  totalWithdrawalSol: number | null
  totalWithdrawalUsd: number | null
  totalFeeSol: number | null
  totalFeeUsd: number | null
  pnlSol: number | null
  pnlUsd: number | null
  pnlPct: number | null
  pnlSolPct: number | null
  feePerTvl24h: number | null
  outOfRange: boolean | null
  lastClosedAt: number | null
}

export type PortfolioTotals = {
  totalCount: number
  totalPositions: number
  solPrice: number | null
  balancesSol: number | null
  unclaimedFeesSol: number | null
  pnlSol: number | null
  pnlSolPct: number | null
}

export type PortfolioSlice = {
  wallet: string
  mode: PortfolioMode
  page: number
  pageSize: number
  rows: PortfolioPoolRow[]
  totals: PortfolioTotals
  /** Rows we hold in the cache — tells the UI how far it can page instantly. */
  loadedRows: number
  hasMore: boolean
  cacheAvailable: boolean
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

type RawPool = Record<string, unknown>

function mapRawPool(raw: RawPool, rank: number): PortfolioPoolRow | null {
  const pool = str(raw.poolAddress)
  if (!pool) return null
  const list = Array.isArray(raw.listPositions)
    ? (raw.listPositions as unknown[]).map((p) => String(p)).filter(Boolean)
    : []
  return {
    pool,
    rank,
    tokenX: {
      mint: str(raw.tokenXMint),
      symbol: str(raw.tokenX),
      icon: str(raw.tokenXIcon),
    },
    tokenY: {
      mint: str(raw.tokenYMint),
      symbol: str(raw.tokenY),
      icon: str(raw.tokenYIcon),
    },
    binStep: num(raw.binStep),
    baseFee: num(raw.baseFee),
    collectFeeMode: num(raw.collectFeeMode),
    openPositionCount: num(raw.openPositionCount),
    listPositions: list,
    balancesSol: num(raw.balancesSol),
    balancesUsd: num(raw.balances),
    unclaimedFeesSol: num(raw.unclaimedFeesSol),
    unclaimedFeesUsd: num(raw.unclaimedFees),
    totalDepositSol: num(raw.totalDepositSol),
    totalDepositUsd: num(raw.totalDeposit),
    totalWithdrawalSol: num(raw.totalWithdrawalSol),
    totalWithdrawalUsd: num(raw.totalWithdrawal),
    totalFeeSol: num(raw.totalFeeSol),
    totalFeeUsd: num(raw.totalFee),
    pnlSol: num(raw.pnlSol),
    pnlUsd: num(raw.pnlUsd) ?? num(raw.pnl),
    pnlPct: num(raw.pnlPctChange),
    pnlSolPct: num(raw.pnlSolPctChange),
    feePerTvl24h: num(raw.feePerTvl24h),
    outOfRange: typeof raw.outOfRange === "boolean" ? raw.outOfRange : null,
    lastClosedAt: num(raw.lastClosedAt),
  }
}

type SourcePage = {
  page: number
  hasNext: boolean
  rows: PortfolioPoolRow[]
  raws: RawPool[]
  totals: PortfolioTotals
}

export async function fetchSourcePage(
  wallet: string,
  mode: PortfolioMode,
  page: number,
): Promise<SourcePage> {
  const path = mode === "open" ? "/portfolio/open" : "/portfolio"
  const url = `${BASE}${path}?user=${encodeURIComponent(wallet)}&page=${page}`
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "YieldSync/1.0" },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Meteora portfolio failed (${res.status})`)
  }
  const json = (await res.json()) as {
    hasNext?: boolean
    totalCount?: number
    totalPositions?: number
    solPrice?: unknown
    total?: Record<string, unknown>
    pools?: RawPool[]
  }
  const offset = (page - 1) * SOURCE_PAGE_SIZE
  const raws = json.pools ?? []
  const rows = raws
    .map((p, i) => mapRawPool(p, offset + i))
    .filter((r): r is PortfolioPoolRow => r !== null)
  const total = json.total ?? {}
  return {
    page,
    hasNext: Boolean(json.hasNext),
    rows,
    raws,
    totals: {
      totalCount: num(json.totalCount) ?? rows.length,
      totalPositions: num(json.totalPositions) ?? 0,
      solPrice: num(json.solPrice),
      balancesSol: num(total.balancesSol),
      unclaimedFeesSol: num(total.unclaimedFeesSol),
      pnlSol: num(total.pnlSol),
      pnlSolPct: num(total.pnlSolPctChange),
    },
  }
}

type PageRow = {
  page: number
  has_next: boolean | null
  total_count: number | null
  total_positions: number | null
  sol_price: number | string | null
  summary: Record<string, unknown> | null
  fetched_at: string
}

/** Cache reads never fail the request — a missing table just means no cache. */
async function readPageRecords(
  supabase: SupabaseClient,
  wallet: string,
  mode: PortfolioMode,
): Promise<{ rows: PageRow[]; available: boolean }> {
  const { data, error } = await supabase
    .from(PAGES_TABLE)
    .select("page, has_next, total_count, total_positions, sol_price, summary, fetched_at")
    .eq("wallet", wallet)
    .eq("mode", mode)
  if (error) {
    console.warn("[portfolio] page cache unavailable:", error.message)
    return { rows: [], available: false }
  }
  return { rows: (data ?? []) as PageRow[], available: true }
}

async function readCachedRows(
  supabase: SupabaseClient,
  wallet: string,
  mode: PortfolioMode,
): Promise<PortfolioPoolRow[]> {
  const { data, error } = await supabase
    .from(POOLS_TABLE)
    .select("raw, rank")
    .eq("wallet", wallet)
    .eq("mode", mode)
    .order("rank", { ascending: true })
  if (error) {
    console.warn("[portfolio] row cache unavailable:", error.message)
    return []
  }
  const rows: PortfolioPoolRow[] = []
  for (const entry of (data ?? []) as { raw: RawPool | null; rank: number }[]) {
    if (!entry.raw) continue
    const mapped = mapRawPool(entry.raw, entry.rank)
    if (mapped) rows.push(mapped)
  }
  return rows
}

async function writeSourcePage(
  supabase: SupabaseClient,
  wallet: string,
  mode: PortfolioMode,
  fetched: SourcePage,
  raws: RawPool[],
) {
  const now = new Date().toISOString()
  const offset = (fetched.page - 1) * SOURCE_PAGE_SIZE
  const rows = fetched.rows.map((r, i) => ({
    wallet,
    mode,
    pool: r.pool,
    rank: offset + i,
    source_page: fetched.page,
    token_x_mint: r.tokenX.mint,
    token_y_mint: r.tokenY.mint,
    token_x_symbol: r.tokenX.symbol,
    token_y_symbol: r.tokenY.symbol,
    token_x_icon: r.tokenX.icon,
    token_y_icon: r.tokenY.icon,
    bin_step: r.binStep,
    base_fee: r.baseFee,
    collect_fee_mode: r.collectFeeMode,
    open_position_count: r.openPositionCount,
    list_positions: r.listPositions,
    balances_sol: r.balancesSol,
    balances_usd: r.balancesUsd,
    unclaimed_fees_sol: r.unclaimedFeesSol,
    unclaimed_fees_usd: r.unclaimedFeesUsd,
    total_deposit_sol: r.totalDepositSol,
    total_deposit_usd: r.totalDepositUsd,
    total_withdrawal_sol: r.totalWithdrawalSol,
    total_withdrawal_usd: r.totalWithdrawalUsd,
    total_fee_sol: r.totalFeeSol,
    total_fee_usd: r.totalFeeUsd,
    pnl_sol: r.pnlSol,
    pnl_usd: r.pnlUsd,
    pnl_pct: r.pnlPct,
    pnl_sol_pct: r.pnlSolPct,
    fee_per_tvl_24h: r.feePerTvl24h,
    out_of_range: r.outOfRange,
    last_closed_at: r.lastClosedAt,
    raw: raws[i] ?? null,
    fetched_at: now,
  }))

  if (rows.length) {
    const { error } = await supabase
      .from(POOLS_TABLE)
      .upsert(rows, { onConflict: "wallet,mode,pool" })
    if (error) console.warn("[portfolio] row cache write failed:", error.message)
  }

  const { error: pageError } = await supabase.from(PAGES_TABLE).upsert(
    {
      wallet,
      mode,
      page: fetched.page,
      page_size: SOURCE_PAGE_SIZE,
      has_next: fetched.hasNext,
      total_count: fetched.totals.totalCount,
      total_positions: fetched.totals.totalPositions,
      sol_price: fetched.totals.solPrice,
      summary: {
        balancesSol: fetched.totals.balancesSol,
        unclaimedFeesSol: fetched.totals.unclaimedFeesSol,
        pnlSol: fetched.totals.pnlSol,
        pnlSolPct: fetched.totals.pnlSolPct,
      },
      fetched_at: now,
    },
    { onConflict: "wallet,mode,page" },
  )
  if (pageError) {
    console.warn("[portfolio] page cache write failed:", pageError.message)
  }
}

export type LoadOptions = {
  wallet: string
  mode: PortfolioMode
  /** 1-based UI page. */
  page: number
  pageSize: number
  /** How many UI pages to have ready, including the requested one. */
  prefetchPages: number
  refresh?: boolean
}

export type PoolRowsResult = {
  rows: PortfolioPoolRow[]
  totals: PortfolioTotals
  cacheAvailable: boolean
  /** True when the wallet has no further pools upstream. */
  exhausted: boolean
}

/**
 * Pool rows in upstream order, pulling source pages only until `minRows` are
 * covered. Pages already cached and fresh are never refetched.
 */
export async function loadPoolRows(
  supabase: SupabaseClient,
  opts: {
    wallet: string
    mode: PortfolioMode
    minRows: number
    refresh?: boolean
  },
): Promise<PoolRowsResult> {
  const { wallet, mode, minRows, refresh } = opts
  const ttl = TTL_MS[mode]

  const [pageRecords, cachedRows] = await Promise.all([
    readPageRecords(supabase, wallet, mode),
    readCachedRows(supabase, wallet, mode),
  ])
  const cacheAvailable = pageRecords.available

  const byRank = new Map<number, PortfolioPoolRow>()
  for (const row of cachedRows) byRank.set(row.rank, row)

  const fresh = new Set<number>()
  let totals: PortfolioTotals = {
    totalCount: 0,
    totalPositions: 0,
    solPrice: null,
    balancesSol: null,
    unclaimedFeesSol: null,
    pnlSol: null,
    pnlSolPct: null,
  }
  let knownHasNext = true
  let newestPageAt = 0

  for (const rec of pageRecords.rows) {
    const age = Date.now() - Date.parse(rec.fetched_at)
    if (Number.isFinite(age) && age < ttl && !refresh) fresh.add(rec.page)
    const at = Date.parse(rec.fetched_at)
    if (Number.isFinite(at) && at > newestPageAt) {
      newestPageAt = at
      const summary = (rec.summary ?? {}) as Record<string, unknown>
      totals = {
        totalCount: rec.total_count ?? 0,
        totalPositions: rec.total_positions ?? 0,
        solPrice: num(rec.sol_price),
        balancesSol: num(summary.balancesSol),
        unclaimedFeesSol: num(summary.unclaimedFeesSol),
        pnlSol: num(summary.pnlSol),
        pnlSolPct: num(summary.pnlSolPct),
      }
    }
  }

  const lastSourcePage = Math.max(
    1,
    Math.ceil(Math.max(1, minRows) / SOURCE_PAGE_SIZE),
  )

  let exhausted = false
  for (let p = 1; p <= lastSourcePage; p += 1) {
    if (fresh.has(p)) continue
    // Nothing beyond the reported total exists, so stop asking for it.
    if (
      totals.totalCount > 0 &&
      (p - 1) * SOURCE_PAGE_SIZE >= totals.totalCount
    ) {
      exhausted = true
      break
    }
    let fetchedPage: SourcePage
    try {
      fetchedPage = await fetchSourcePage(wallet, mode, p)
    } catch (err) {
      // Serve whatever the cache has rather than failing the whole page.
      console.warn("[portfolio] upstream fetch failed", mode, p, err)
      break
    }

    totals = fetchedPage.totals
    knownHasNext = fetchedPage.hasNext
    for (const row of fetchedPage.rows) byRank.set(row.rank, row)
    if (cacheAvailable) {
      await writeSourcePage(supabase, wallet, mode, fetchedPage, fetchedPage.raws)
    }
    if (!fetchedPage.hasNext) {
      exhausted = true
      break
    }
  }

  const ordered = [...byRank.values()].sort((a, b) => a.rank - b.rank)
  if (totals.totalCount === 0 && ordered.length) {
    totals = { ...totals, totalCount: ordered.length }
  }
  if (!knownHasNext) exhausted = true

  return { rows: ordered, totals, cacheAvailable, exhausted }
}

/**
 * Serve one UI page of pool rows from the cache, pulling only the upstream
 * pages that the requested window (plus the prefetch lookahead) needs.
 */
export async function loadPortfolioSlice(
  supabase: SupabaseClient,
  opts: LoadOptions,
): Promise<PortfolioSlice> {
  const { wallet, mode, page, pageSize, prefetchPages, refresh } = opts
  const firstRow = (page - 1) * pageSize
  const minRows = firstRow + pageSize * Math.max(1, prefetchPages)

  const { rows, totals, cacheAvailable, exhausted } = await loadPoolRows(
    supabase,
    { wallet, mode, minRows, refresh },
  )

  return {
    wallet,
    mode,
    page,
    pageSize,
    rows: rows.slice(firstRow, firstRow + pageSize),
    totals,
    loadedRows: rows.length,
    hasMore: !exhausted || rows.length < totals.totalCount,
    cacheAvailable,
  }
}
