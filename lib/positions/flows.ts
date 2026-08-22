import type { CachedDlmmPool, PoolTokenMeta } from "@/lib/pools/meteora-cache"

/** Where an amount came from — `ix_args` means requested, not settled. */
export type FlowAmountSource = "cpi_event" | "log" | "ix_args"

export type FlowKind =
  | "open"
  | "add"
  | "remove"
  | "claim_fee"
  | "claim_reward"
  | "composition_fee"
  | "close"

export type PositionFlowEvent = {
  signature: string
  slot: number
  blockTime: number | null
  ixIndex: number
  kind: FlowKind
  protocol: string
  instructionName: string
  eventName: string | null
  source: FlowAmountSource
  amountX: bigint
  amountY: bigint
  activeBinId: number | null
  pool: string | null
  position: string | null
  owner: string | null
}

export type PositionFlows = {
  position: string
  pool: string | null
  owner: string | null
  protocol: string | null
  isClosed: boolean
  openedAt: number | null
  closedAt: number | null
  firstSlot: number | null
  lastSlot: number | null
  binLower: number | null
  binUpper: number | null
  depositX: bigint
  depositY: bigint
  withdrawX: bigint
  withdrawY: bigint
  feeClaimedX: bigint
  feeClaimedY: bigint
  rewardClaimed: bigint
  compositionFeeX: bigint
  compositionFeeY: bigint
  /** Deposited minus withdrawn — the balance our own transactions put in. */
  netDepositedX: bigint
  netDepositedY: bigint
  pnlX: bigint
  pnlY: bigint
  addCount: number
  removeCount: number
  claimFeeCount: number
  claimRewardCount: number
  /** Flows without an Anchor event; amounts are requested, not settled. */
  estimatedAmounts: number
  events: PositionFlowEvent[]
}

export type WalletFlowsSummary = {
  wallet: string
  signaturesScanned: number
  txFetched: number
  txFetchFailed: number
  /** Transactions that reverted on-chain — skipped, they settled nothing. */
  txReverted: number
  txWithLp: number
  lpActionCount: number
  nestedLpActionCount: number
  flowEventCount: number
  positionsTotal: number
  positionsOpen: number
  positionsWithEstimatedAmounts: number
  undecodedMeteoraIxCount: number
  byAmountSource: Record<string, number>
  byAction: Record<string, number>
  elapsedMs: number
  oldestSignature: string | null
}

export type WalletFlowsResponse = {
  summary: WalletFlowsSummary
  positions: PositionFlows[]
}

type RawFlowEvent = {
  signature?: string
  slot?: number
  block_time?: number | null
  ix_index?: number
  kind?: string
  protocol?: string
  instruction_name?: string
  event_name?: string | null
  source?: string
  amount_x?: string
  amount_y?: string
  active_bin_id?: number | null
  pool?: string | null
  position?: string | null
  owner?: string | null
}

type RawPosition = Record<string, unknown> & {
  position?: string
  events?: RawFlowEvent[]
}

function big(v: unknown): bigint {
  if (typeof v === "bigint") return v
  if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v))
  if (typeof v === "string" && /^-?\d+$/.test(v.trim())) return BigInt(v.trim())
  return 0n
}

function int(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null
}

function mapEvent(raw: RawFlowEvent): PositionFlowEvent {
  return {
    signature: raw.signature ?? "",
    slot: raw.slot ?? 0,
    blockTime: raw.block_time ?? null,
    ixIndex: raw.ix_index ?? 0,
    kind: (raw.kind as FlowKind) ?? "add",
    protocol: raw.protocol ?? "",
    instructionName: raw.instruction_name ?? "",
    eventName: raw.event_name ?? null,
    source: (raw.source as FlowAmountSource) ?? "ix_args",
    amountX: big(raw.amount_x),
    amountY: big(raw.amount_y),
    activeBinId: raw.active_bin_id ?? null,
    pool: raw.pool ?? null,
    position: raw.position ?? null,
    owner: raw.owner ?? null,
  }
}

function mapPosition(raw: RawPosition): PositionFlows {
  return {
    position: raw.position ?? "",
    pool: str(raw.pool),
    owner: str(raw.owner),
    protocol: str(raw.protocol),
    isClosed: Boolean(raw.is_closed),
    openedAt: int(raw.opened_at),
    closedAt: int(raw.closed_at),
    firstSlot: int(raw.first_slot),
    lastSlot: int(raw.last_slot),
    binLower: int(raw.bin_lower),
    binUpper: int(raw.bin_upper),
    depositX: big(raw.deposit_x),
    depositY: big(raw.deposit_y),
    withdrawX: big(raw.withdraw_x),
    withdrawY: big(raw.withdraw_y),
    feeClaimedX: big(raw.fee_claimed_x),
    feeClaimedY: big(raw.fee_claimed_y),
    rewardClaimed: big(raw.reward_claimed),
    compositionFeeX: big(raw.composition_fee_x),
    compositionFeeY: big(raw.composition_fee_y),
    netDepositedX: big(raw.net_deposited_x),
    netDepositedY: big(raw.net_deposited_y),
    pnlX: big(raw.pnl_x),
    pnlY: big(raw.pnl_y),
    addCount: int(raw.add_count) ?? 0,
    removeCount: int(raw.remove_count) ?? 0,
    claimFeeCount: int(raw.claim_fee_count) ?? 0,
    claimRewardCount: int(raw.claim_reward_count) ?? 0,
    estimatedAmounts: int(raw.estimated_amounts) ?? 0,
    events: Array.isArray(raw.events) ? raw.events.map(mapEvent) : [],
  }
}

function mapSummary(raw: Record<string, unknown>): WalletFlowsSummary {
  const counts = (v: unknown): Record<string, number> =>
    v && typeof v === "object" ? (v as Record<string, number>) : {}
  return {
    wallet: str(raw.wallet) ?? "",
    signaturesScanned: int(raw.signatures_scanned) ?? 0,
    txFetched: int(raw.tx_fetched) ?? 0,
    txFetchFailed: int(raw.tx_fetch_failed) ?? 0,
    txReverted: int(raw.tx_reverted) ?? 0,
    txWithLp: int(raw.tx_with_lp) ?? 0,
    lpActionCount: int(raw.lp_action_count) ?? 0,
    nestedLpActionCount: int(raw.nested_lp_action_count) ?? 0,
    flowEventCount: int(raw.flow_event_count) ?? 0,
    positionsTotal: int(raw.positions_total) ?? 0,
    positionsOpen: int(raw.positions_open) ?? 0,
    positionsWithEstimatedAmounts:
      int(raw.positions_with_estimated_amounts) ?? 0,
    undecodedMeteoraIxCount: int(raw.undecoded_meteora_ix_count) ?? 0,
    byAmountSource: counts(raw.by_amount_source),
    byAction: counts(raw.by_action),
    elapsedMs: int(raw.elapsed_ms) ?? 0,
    oldestSignature: str(raw.oldest_signature),
  }
}

export type WalletFlowsOptions = {
  /** Signatures to scan, newest first. */
  limit?: number
  concurrency?: number
  /** Restrict to actions signed by this wallet (live stream behaviour). */
  filterWatchlist?: boolean
  includeEvents?: boolean
  signal?: AbortSignal
}

/**
 * Replay a wallet's transactions through the backend decode path and return the
 * per-position flows it extracted from instruction data.
 */
export async function fetchWalletFlows(
  address: string,
  options: WalletFlowsOptions = {},
): Promise<WalletFlowsResponse> {
  const { signal, ...rest } = options
  const res = await fetch("/api/debug/extract-wallet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet: address.trim(), ...rest }),
    cache: "no-store",
    signal,
  })
  const json = (await res.json().catch(() => null)) as
    | { summary?: Record<string, unknown>; positions?: RawPosition[]; error?: string }
    | null
  if (!res.ok) {
    throw new Error(json?.error || `Flow extraction failed (${res.status})`)
  }
  return {
    summary: mapSummary(json?.summary ?? {}),
    positions: Array.isArray(json?.positions)
      ? json.positions.map(mapPosition)
      : [],
  }
}

/** Index flows by position address so table rows can look them up. */
export function indexFlowsByPosition(flows: PositionFlows[]) {
  const map: Record<string, PositionFlows> = {}
  for (const f of flows) {
    if (!f.position) continue
    const prev = map[f.position]
    // Prefer the richer record when the same position shows up twice.
    if (!prev || f.events.length > prev.events.length) map[f.position] = f
  }
  return map
}

const SOL_MINT = "So11111111111111111111111111111111111111112"
const STABLE_SYMBOLS = new Set(["USDC", "USDT", "PYUSD", "USDS"])

/** Which side of the pair is the quote (SOL, else a stable). */
export function quoteSide(pool?: CachedDlmmPool): "x" | "y" | null {
  if (!pool) return null
  if (pool.tokenX.address === SOL_MINT) return "x"
  if (pool.tokenY.address === SOL_MINT) return "y"
  const sx = (pool.tokenX.symbol || "").toUpperCase()
  const sy = (pool.tokenY.symbol || "").toUpperCase()
  if (STABLE_SYMBOLS.has(sx)) return "x"
  if (STABLE_SYMBOLS.has(sy)) return "y"
  return null
}

export function toUiAmount(raw: bigint, decimals: number | null): number {
  const d = decimals ?? 0
  if (d <= 0) return Number(raw)
  const negative = raw < 0n
  const abs = negative ? -raw : raw
  const base = 10n ** BigInt(d)
  const whole = abs / base
  const frac = abs % base
  const value = Number(whole) + Number(frac) / Number(base)
  return negative ? -value : value
}

export function formatUiAmount(value: number, opts: { signed?: boolean } = {}) {
  if (!Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  const digits = abs === 0 ? 0 : abs < 0.001 ? 6 : abs < 1 ? 4 : abs < 1000 ? 3 : 2
  const text = abs.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    notation: abs >= 1_000_000 ? "compact" : "standard",
  })
  if (!opts.signed || value === 0) return text
  return `${value > 0 ? "+" : "−"}${text}`
}

export function formatTokenAmount(
  raw: bigint,
  token: PoolTokenMeta | undefined,
  opts: { signed?: boolean; withSymbol?: boolean } = {},
) {
  // Without pool metadata we cannot scale, so say so instead of faking a unit.
  if (token?.decimals == null) {
    const sign = opts.signed && raw > 0n ? "+" : ""
    return `${sign}${raw.toString()} raw`
  }
  const value = toUiAmount(raw, token.decimals)
  const text = formatUiAmount(value, opts)
  if (text === "—") return text
  const symbol = token?.symbol?.trim()
  return opts.withSymbol !== false && symbol ? `${text} ${symbol}` : text
}

/** `1.23 SOL · 4.5M BONK`, quote token first when we can tell. */
export function formatPairAmounts(
  amountX: bigint,
  amountY: bigint,
  pool?: CachedDlmmPool,
  opts: { signed?: boolean } = {},
) {
  if (amountX === 0n && amountY === 0n) return "0"
  const parts: string[] = []
  const x = { raw: amountX, token: pool?.tokenX }
  const y = { raw: amountY, token: pool?.tokenY }
  const ordered = quoteSide(pool) === "y" ? [y, x] : [x, y]
  for (const side of ordered) {
    if (side.raw === 0n) continue
    parts.push(formatTokenAmount(side.raw, side.token, opts))
  }
  return parts.length ? parts.join(" · ") : "0"
}

export function flowKindLabel(kind: FlowKind) {
  switch (kind) {
    case "open":
      return "Open position"
    case "add":
      return "Add liquidity"
    case "remove":
      return "Remove liquidity"
    case "claim_fee":
      return "Claim fee"
    case "claim_reward":
      return "Claim reward"
    case "composition_fee":
      return "Composition fee"
    case "close":
      return "Close position"
    default:
      return kind
  }
}

export function amountSourceLabel(source: FlowAmountSource) {
  if (source === "cpi_event") return "Anchor CPI event"
  if (source === "log") return "Anchor event log"
  return "Instruction args (requested)"
}
