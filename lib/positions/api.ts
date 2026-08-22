import type { PositionFlows } from "@/lib/positions/flows"

export type PositionMapping = {
  id: string
  strategy_id?: string | null
  protocol?: string | null
  pool?: string | null
  source_position?: string | null
  user_position?: string | null
  source_owner?: string | null
  execution_wallet?: string | null
  status?: string | null
  opened_at?: string | null
  closed_at?: string | null
  bin_lower?: number | null
  bin_upper?: number | null
  liquidity_adds?: number | null
}

export type PositionsWalletResponse = {
  wallet: string
  open: PositionMapping[]
  closed: PositionMapping[]
  count_open?: number
  count_closed?: number
  error?: string
}

export type PositionWalletRole = "tracking" | "trading" | "both" | "unknown"

export type PositionListItem = PositionMapping & {
  /** Wallet used for the API fetch */
  queriedWallet: string
  walletRole: PositionWalletRole
  /** True when this mapping came from a copy strategy */
  isCopyTrade: boolean
  /** True when the row exists only in the extracted chain data, unmapped */
  isExtracted?: boolean
}

const FLOW_ROW_PREFIX = "flow:"

function isoFromUnix(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return null
  return new Date(seconds * 1000).toISOString()
}

/**
 * A position we extracted from chain data but never mapped to a copy strategy.
 * Own trading wallets own `user_position`, tracked leaders `source_position`.
 */
export function positionRowFromFlows(
  flow: PositionFlows,
  queriedWallet: string,
  walletRole: PositionWalletRole,
): PositionListItem {
  const isOwn = walletRole === "trading" || walletRole === "both"
  return {
    id: `${FLOW_ROW_PREFIX}${flow.position}`,
    strategy_id: null,
    protocol: flow.protocol,
    pool: flow.pool,
    source_position: isOwn ? null : flow.position,
    user_position: isOwn ? flow.position : null,
    source_owner: isOwn ? null : flow.owner,
    execution_wallet: isOwn ? flow.owner ?? queriedWallet : null,
    status: flow.isClosed ? "closed" : "open",
    opened_at: isoFromUnix(flow.openedAt),
    closed_at: isoFromUnix(flow.closedAt),
    bin_lower: flow.binLower,
    bin_upper: flow.binUpper,
    liquidity_adds: flow.addCount,
    queriedWallet,
    walletRole,
    isCopyTrade: false,
    isExtracted: true,
  }
}

export async function fetchPositionsForWallet(
  address: string,
): Promise<PositionsWalletResponse> {
  const wallet = address.trim()
  const res = await fetch(
    `/api/wallets/${encodeURIComponent(wallet)}/positions`,
    { cache: "no-store" },
  )
  const json = (await res.json().catch(() => null)) as
    | PositionsWalletResponse
    | { error?: string }
    | null
  if (!res.ok) {
    throw new Error(
      (json && "error" in json && json.error) ||
        `Failed to load positions (${res.status})`,
    )
  }
  const data = json as PositionsWalletResponse
  return {
    wallet: data.wallet || wallet,
    open: Array.isArray(data.open) ? data.open : [],
    closed: Array.isArray(data.closed) ? data.closed : [],
    count_open: data.count_open,
    count_closed: data.count_closed,
  }
}

export function formatAge(openedAt?: string | null, closedAt?: string | null) {
  if (!openedAt) return "—"
  const start = Date.parse(openedAt)
  if (!Number.isFinite(start)) return "—"
  const end = closedAt ? Date.parse(closedAt) : Date.now()
  if (!Number.isFinite(end)) return "—"
  const ms = Math.max(0, end - start)
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = ms / 3_600_000
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 2 : 1)}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "a day"
  if (days < 30) return `${days} days`
  return `${Math.floor(days / 30)} mo`
}

export function formatWhen(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-GB", {
      hour12: false,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function formatRelativeClosed(iso?: string | null) {
  if (!iso) return "—"
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return "—"
  const mins = Math.floor((Date.now() - t) / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export function protocolLabel(protocol?: string | null) {
  const p = (protocol || "").toLowerCase()
  if (p === "dlmm") return "DLMM"
  if (p === "damm_v2" || p === "dammv2") return "DAMM v2"
  if (p === "damm" || p === "damm_v1") return "DAMM"
  if (!p) return "—"
  return p.toUpperCase()
}
