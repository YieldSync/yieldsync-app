import {
  num,
  str,
  type PositionToken,
  type WalletPosition,
} from "@/lib/meteora/types"

const BASE = "https://damm-v2.datapi.meteora.ag"
/** Closed positions page with a cursor; this caps one request's walk. */
const MAX_CLOSED_PAGES = 10
const CLOSED_PAGE_LIMIT = 50

type Raw = Record<string, unknown>

function obj(v: unknown): Raw {
  return (v ?? {}) as Raw
}

function token(v: unknown): PositionToken {
  const t = obj(v)
  return {
    mint: str(t.address),
    symbol: str(t.symbol),
    icon: str(t.icon),
    decimals: num(t.decimals),
  }
}

/** AmountTotals: per-token amount plus its SOL and USD value. */
type Totals = {
  x: number | null
  y: number | null
  sol: number | null
  usd: number | null
}

function totals(v: unknown): Totals {
  const t = obj(v)
  const xSol = num(t.amount_x_sol)
  const ySol = num(t.amount_y_sol)
  const xUsd = num(t.amount_x_usd)
  const yUsd = num(t.amount_y_usd)
  return {
    x: num(t.amount_x),
    y: num(t.amount_y),
    sol: xSol == null && ySol == null ? null : (xSol ?? 0) + (ySol ?? 0),
    usd: xUsd == null && yUsd == null ? null : (xUsd ?? 0) + (yUsd ?? 0),
  }
}

/**
 * DAMM v2 reports positions per wallet directly, so no pool walk is needed.
 * Field names are snake_case here, unlike the DLMM API.
 */
export function mapDammPosition(raw: Raw): WalletPosition | null {
  const position = str(raw.position_address)
  if (!position) return null
  const config = obj(raw.pool_config)
  const current = obj(raw.current_position)
  const deposits = totals(raw.total_deposits)
  const withdraws = totals(raw.total_withdraws)
  const fees = totals(raw.total_claimed_fees)
  const balance = totals(current.current_deposits)
  const unclaimed = totals(current.unclaimed_fees)
  const isClosed =
    typeof raw.is_closed === "boolean" ? raw.is_closed : raw.closed_at != null

  return {
    protocol: "damm2",
    position,
    pool: str(raw.pool_address) ?? "",
    poolName: str(raw.pool_name),
    tokenX: token(raw.token_x),
    tokenY: token(raw.token_y),
    binStep: null,
    baseFee: num(config.base_fee_pct),
    isClosed,
    isOutOfRange: null,
    createdAt: num(raw.created_at),
    closedAt: num(raw.closed_at),
    updatedAt: num(current.updated_at_slot) == null ? null : num(raw.created_at),
    lowerBinId: null,
    upperBinId: null,
    minPrice: num(config.min_price),
    maxPrice: num(config.max_price),
    poolActivePrice: num(raw.pool_price),
    feePerTvl24h: num(raw.fee_per_tvl_24h),
    strategy: config.concentrated_liquidity ? "Concentrated" : "Spot",
    investedSol: deposits.sol,
    investedUsd: deposits.usd,
    investedX: deposits.x,
    investedY: deposits.y,
    withdrawnSol: withdraws.sol,
    feeSol: fees.sol,
    feeUsd: fees.usd,
    feeX: fees.x,
    feeY: fees.y,
    balanceSol: isClosed ? null : balance.sol,
    balanceUsd: isClosed ? null : balance.usd,
    unclaimedFeeSol: isClosed ? null : unclaimed.sol,
    unclaimedFeeUsd: isClosed ? null : unclaimed.usd,
    pnlSol: num(raw.pnl_sol) ?? num(raw.unrealized_pnl),
    pnlUsd: num(raw.pnl) ?? num(raw.unrealized_pnl),
    pnlPct:
      num(raw.pnl_sol_pct_change) ??
      num(raw.pnl_change_pct) ??
      num(raw.unrealized_pnl_change_pct),
  }
}

async function get(url: string): Promise<Raw> {
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "YieldSync/1.0" },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`DAMM v2 API failed (${res.status})`)
  return (await res.json()) as Raw
}

export type DammOpenResult = {
  positions: WalletPosition[]
  raws: Raw[]
  totalPositions: number
  balancesSol: number | null
  unclaimedFeesSol: number | null
  pnlSol: number | null
  pnlSolPct: number | null
}

export async function fetchDammOpenPositions(
  wallet: string,
): Promise<DammOpenResult> {
  const json = await get(
    `${BASE}/wallets/${encodeURIComponent(wallet)}/open_positions`,
  )
  const raws = Array.isArray(json.data) ? (json.data as Raw[]) : []
  const total = obj(json.total)
  return {
    positions: raws
      .map(mapDammPosition)
      .filter((p): p is WalletPosition => p !== null),
    raws,
    totalPositions: num(json.total_positions) ?? raws.length,
    balancesSol: num(total.balances_sol),
    unclaimedFeesSol: num(total.unclaimed_fees_sol),
    pnlSol: num(total.pnl_sol),
    pnlSolPct: num(total.pnl_sol_pct_change),
  }
}

export type DammClosedResult = {
  positions: WalletPosition[]
  raws: Raw[]
  /** Null once the walk reached the end of the wallet's history. */
  nextCursor: string | null
}

/**
 * Closed positions are cursor-paginated. `minRows` walks just far enough to
 * cover the page the UI asked for.
 */
export async function fetchDammClosedPositions(
  wallet: string,
  opts: { minRows: number; cursor?: string | null } = { minRows: 50 },
): Promise<DammClosedResult> {
  const positions: WalletPosition[] = []
  const raws: Raw[] = []
  let cursor = opts.cursor ?? null
  let nextCursor: string | null = null

  for (let page = 0; page < MAX_CLOSED_PAGES; page += 1) {
    const params = new URLSearchParams({ limit: String(CLOSED_PAGE_LIMIT) })
    if (cursor) params.set("next_cursor", cursor)
    const json = await get(
      `${BASE}/wallets/${encodeURIComponent(wallet)}/closed_positions?${params}`,
    )
    const batch = Array.isArray(json.data) ? (json.data as Raw[]) : []
    for (const raw of batch) {
      const mapped = mapDammPosition(raw)
      if (mapped) {
        positions.push({ ...mapped, isClosed: true })
        raws.push(raw)
      }
    }
    nextCursor = str(json.next_cursor)
    cursor = nextCursor
    if (!cursor || !batch.length || positions.length >= opts.minRows) break
  }

  return { positions, raws, nextCursor }
}

export async function fetchDammTotals(wallet: string) {
  const json = await get(`${BASE}/wallets/${encodeURIComponent(wallet)}/total`)
  return {
    closedPositions: num(json.total_closed_positions) ?? 0,
    pnlSol: num(json.total_pnl_sol),
    pnlSolPct: num(json.total_pnl_sol_pct_change),
  }
}
