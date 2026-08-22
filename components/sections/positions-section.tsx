"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  HelpCircle,
  LayoutGrid,
  RefreshCw,
  Snowflake,
  Table as TableIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  SectionHeader,
  StatusBadge,
} from "@/components/dashboard/primitives"
import { WalletLink } from "@/components/wallet/wallet-link"
import { PositionDetailDialog } from "@/components/sections/position-detail-dialog"
import { useTradingWallets } from "@/hooks/use-trading-wallets"
import { useWalletsData } from "@/hooks/use-wallets-data"
import {
  formatPoolAge,
  type CachedDlmmPool,
} from "@/lib/pools/meteora-cache"
import {
  fetchPositionsForWallet,
  formatAge,
  formatRelativeClosed,
  formatWhen,
  positionRowFromFlows,
  protocolLabel,
  type PositionListItem,
  type PositionWalletRole,
} from "@/lib/positions/api"
import {
  fetchWalletFlows,
  formatPairAmounts,
  indexFlowsByPosition,
  type PositionFlows,
  type WalletFlowsSummary,
} from "@/lib/positions/flows"
import {
  formatSol,
  priceRequestsForFlows,
  solMetricsForFlows,
  type SolMetrics,
} from "@/lib/positions/sol-value"
import { fetchPricesAt, type PriceMap } from "@/lib/prices/client"
import type { PriceRequest } from "@/lib/prices/token-prices"
import { cn, truncateAddress } from "@/lib/utils"

const PAGE_SIZE = 12
const SCAN_LIMITS = [200, 500, 1000] as const

type WalletScope = "all" | "tracking" | "trading" | "wallet"
type ViewMode = "table" | "card"

function solscanAccount(address: string) {
  return `https://solscan.io/account/${address}`
}

function statusTone(status: string): string {
  const s = status.toLowerCase()
  if (s === "confirmed" || s === "open") return "Active"
  if (s === "sent" || s === "signed" || s === "pending" || s === "closing") {
    return "Pending"
  }
  if (s === "failed" || s === "error") return "Failed"
  if (s === "skipped" || s === "closed") return "Skipped"
  return status
}

function roleForAddress(
  address: string,
  tracking: Set<string>,
  trading: Set<string>,
): PositionWalletRole {
  const a = address.trim()
  const isT = tracking.has(a)
  const isX = trading.has(a)
  if (isT && isX) return "both"
  if (isT) return "tracking"
  if (isX) return "trading"
  return "unknown"
}

function dedupePositions(rows: PositionListItem[]) {
  const map = new Map<string, PositionListItem>()
  for (const row of rows) {
    const prev = map.get(row.id)
    if (!prev) {
      map.set(row.id, row)
      continue
    }
    if (prev.walletRole === "unknown" && row.walletRole !== "unknown") {
      map.set(row.id, row)
    } else if (prev.walletRole !== "both" && row.walletRole === "both") {
      map.set(row.id, row)
    }
  }
  return [...map.values()]
}

function MetricSoon({
  label,
  tip,
}: {
  label?: string
  tip: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex cursor-help items-center gap-1 text-muted-foreground tabular">
            {label ?? "—"}
            <HelpCircle className="size-3 opacity-60" />
          </span>
        }
      />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}

const METRICS_TIP =
  "Needs backend valuation (invested / value / fees / uPnL). Wired later."
const VALUE_TIP =
  "Current position value needs a live price + on-chain bin balances. Not extracted from transactions."
const DPR_TIP =
  "DPR = Daily Percentage Rate — estimated daily fee yield vs position value (fees ÷ value, annualized to a day). Needs value data."
const FLOWS_OFF_TIP =
  "Turn on “Metrics from chain” to extract amounts from transaction instruction data."
const FLOWS_MISSING_TIP =
  "No decoded flows for this position in the scanned window — increase the scan depth."
const ESTIMATE_TIP =
  "Some amounts come from instruction args because the program emitted no Anchor event — requested, not settled."

/** Amounts extracted from instruction data, per token side. */
function FlowAmountCell({
  amountX,
  amountY,
  pool,
  flows,
  enabled,
  signed,
  estimateWarning,
}: {
  amountX?: bigint
  amountY?: bigint
  pool?: CachedDlmmPool
  flows?: PositionFlows
  enabled: boolean
  signed?: boolean
  estimateWarning?: boolean
}) {
  if (!enabled) return <MetricSoon tip={FLOWS_OFF_TIP} />
  if (!flows || amountX == null || amountY == null) {
    return <MetricSoon tip={FLOWS_MISSING_TIP} />
  }
  const text = formatPairAmounts(amountX, amountY, pool, { signed })
  const negative = signed && amountX + amountY < 0n
  const positive = signed && amountX + amountY > 0n
  const warn = estimateWarning && flows.estimatedAmounts > 0
  const body = (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular",
        positive && "text-success",
        negative && "text-danger",
      )}
    >
      {text}
      {warn ? <AlertTriangle className="size-3 text-warning" /> : null}
    </span>
  )
  if (!warn) return body
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="cursor-help">{body}</span>} />
      <TooltipContent className="max-w-xs">{ESTIMATE_TIP}</TooltipContent>
    </Tooltip>
  )
}

const SOL_PNL_TIP =
  "Realised PnL in SOL: withdrawals plus claimed fees minus deposits, each amount valued at the token price of its own block time (Mobula)."
const PRICING_TIP =
  "Resolving historical token prices for this position's flow timestamps…"
const PRICE_MISSING_TIP =
  "No historical price for this position's tokens, so the amounts cannot be valued in SOL."

/** Realised PnL converted to SOL at the price of each flow's block time. */
function SolPnlCell({
  metrics,
  flows,
  enabled,
  pricing,
}: {
  metrics: SolMetrics | null
  flows?: PositionFlows
  enabled: boolean
  pricing: boolean
}) {
  if (!enabled) return <MetricSoon tip={FLOWS_OFF_TIP} />
  if (!flows) return <MetricSoon tip={FLOWS_MISSING_TIP} />
  if (!metrics) {
    return <MetricSoon tip={pricing ? PRICING_TIP : PRICE_MISSING_TIP} />
  }
  const incomplete = metrics.unpricedSides > 0
  const body = (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular",
        metrics.pnlSol > 0 && "text-success",
        metrics.pnlSol < 0 && "text-danger",
      )}
    >
      {formatSol(metrics.pnlSol, { signed: true })}
      {incomplete ? <AlertTriangle className="size-3 text-warning" /> : null}
    </span>
  )
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="cursor-help">{body}</span>} />
      <TooltipContent className="max-w-xs">
        {`In ${formatSol(metrics.investedSol)} · out ${formatSol(
          metrics.withdrawnSol,
        )} · fees ${formatSol(metrics.feesSol)}`}
        {incomplete
          ? ` · ${metrics.unpricedSides} amount${
              metrics.unpricedSides === 1 ? "" : "s"
            } without a price`
          : ""}
      </TooltipContent>
    </Tooltip>
  )
}

function TokenPairIcons({ pool }: { pool?: CachedDlmmPool }) {
  const x = pool?.tokenX.imageUrl
  const y = pool?.tokenY.imageUrl
  return (
    <div className="relative flex size-9 shrink-0 items-center">
      <span className="absolute left-0 top-0 size-6 overflow-hidden rounded-full border border-border bg-muted">
        {x ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={x} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[9px] font-semibold text-muted-foreground">
            {(pool?.tokenX.symbol || "?").slice(0, 2)}
          </span>
        )}
      </span>
      <span className="absolute left-3.5 top-2 size-6 overflow-hidden rounded-full border border-border bg-muted">
        {y ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={y} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[9px] font-semibold text-muted-foreground">
            {(pool?.tokenY.symbol || "?").slice(0, 2)}
          </span>
        )}
      </span>
    </div>
  )
}

function RangeBar({
  lower,
  upper,
}: {
  lower?: number | null
  upper?: number | null
}) {
  if (lower == null || upper == null) {
    return <span className="text-muted-foreground">—</span>
  }
  const mid = (lower + upper) / 2
  return (
    <div className="min-w-[140px]">
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 w-full rounded-full bg-primary/70" />
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
      </div>
      <div className="mt-1 flex justify-between gap-2 text-[10px] tabular text-muted-foreground">
        <span>{lower}</span>
        <span className="text-foreground/70">{mid.toFixed(0)}</span>
        <span>{upper}</span>
      </div>
    </div>
  )
}

function PoolCell({
  row,
  pool,
}: {
  row: PositionListItem
  pool?: CachedDlmmPool
}) {
  const proto = protocolLabel(row.protocol)
  const name =
    pool?.name ||
    (pool?.tokenX.symbol && pool?.tokenY.symbol
      ? `${pool.tokenX.symbol}/${pool.tokenY.symbol}`
      : null)
  const verified =
    Boolean(pool?.tokenX.isVerified) || Boolean(pool?.tokenY.isVerified)
  const freezeOk =
    pool == null
      ? null
      : pool.tokenX.freezeAuthorityDisabled &&
        pool.tokenY.freezeAuthorityDisabled
  const configTip = pool
    ? [
        `bin_step: ${pool.binStep ?? "—"}`,
        `base_fee: ${pool.baseFeePct ?? "—"}%`,
        `max_fee: ${pool.maxFeePct ?? "—"}%`,
        `protocol_fee: ${pool.protocolFeePct ?? "—"}%`,
        `collect_fee_mode: ${pool.collectFeeMode ?? "—"}`,
        `dynamic_fee: ${pool.dynamicFeePct ?? "—"}%`,
      ].join(" · ")
    : "Pool metadata not loaded"

  return (
    <div className="flex min-w-[220px] items-start gap-2.5">
      <TokenPairIcons pool={pool} />
      <div className="min-w-0 leading-tight">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">
            {name || (row.pool ? truncateAddress(row.pool, 4) : "Unknown pool")}
          </span>
          <Badge
            variant="secondary"
            className="h-5 rounded-sm bg-chart-3/15 px-1.5 text-[10px] font-semibold text-chart-3"
          >
            {proto}
          </Badge>
          {row.isCopyTrade ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              Copy
            </Badge>
          ) : null}
          {row.isExtracted ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge
                    variant="outline"
                    className="h-5 border-dashed px-1.5 text-[10px] text-muted-foreground"
                  >
                    Chain
                  </Badge>
                }
              />
              <TooltipContent>
                Extracted from chain data — no copy strategy mapping
              </TooltipContent>
            </Tooltip>
          ) : null}
          {verified ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex text-success">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                }
              />
              <TooltipContent>Verified token (Meteora)</TooltipContent>
            </Tooltip>
          ) : null}
          {freezeOk === true ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex text-muted-foreground">
                    <Snowflake className="size-3.5" />
                  </span>
                }
              />
              <TooltipContent>Freeze authority disabled</TooltipContent>
            </Tooltip>
          ) : freezeOk === false ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex text-danger">
                    <Snowflake className="size-3.5" />
                  </span>
                }
              />
              <TooltipContent>Freeze authority still enabled</TooltipContent>
            </Tooltip>
          ) : null}
          {pool?.isBlacklisted ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex text-danger">
                    <AlertTriangle className="size-3.5" />
                  </span>
                }
              />
              <TooltipContent>Pool is blacklisted on Meteora</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-help tabular">
                  age {formatPoolAge(pool?.createdAtMs)}
                </span>
              }
            />
            <TooltipContent>Pool age (Meteora created_at)</TooltipContent>
          </Tooltip>
          <span>·</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-help tabular">
                  bin {pool?.binStep ?? "—"} · fee{" "}
                  {pool?.baseFeePct != null ? `${pool.baseFeePct}%` : "—"}
                </span>
              }
            />
            <TooltipContent>{configTip}</TooltipContent>
          </Tooltip>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {row.user_position ? (
            <a
              href={solscanAccount(row.user_position)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              {truncateAddress(row.user_position, 4)}
              <ExternalLink className="size-3" />
            </a>
          ) : row.pool ? (
            <WalletLink address={row.pool} chars={4} />
          ) : (
            "—"
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tip,
}: {
  label: string
  value: string | number
  tip?: string
}) {
  const body = (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {tip ? <HelpCircle className="size-3 opacity-50" /> : null}
      </span>
      <span className="text-sm font-semibold tabular">{value}</span>
    </div>
  )
  if (!tip) return body
  return (
    <Tooltip>
      <TooltipTrigger render={<div className="cursor-help">{body}</div>} />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}

function PaginationBar({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number
  pageCount: number
  total: number
  onPage: (p: number) => void
}) {
  if (total <= PAGE_SIZE) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
      <span className="text-muted-foreground">
        {(page - 1) * PAGE_SIZE + 1}–
        {Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft data-icon="inline-start" />
          Prev
        </Button>
        <span className="tabular text-muted-foreground">
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}

function usePaged<T>(rows: T[]) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  useEffect(() => {
    setPage(1)
  }, [rows])
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])
  const slice = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  )
  return { page, setPage, pageCount, slice, total: rows.length }
}

function PositionsDataTable({
  rows,
  mode,
  empty,
  pools,
  flowsFor,
  solFor,
  metricsEnabled,
  pricing,
  onSelect,
}: {
  rows: PositionListItem[]
  mode: "open" | "closed"
  empty: string
  pools: Record<string, CachedDlmmPool>
  flowsFor: (row: PositionListItem) => PositionFlows | undefined
  solFor: (row: PositionListItem) => SolMetrics | null
  metricsEnabled: boolean
  pricing: boolean
  onSelect: (row: PositionListItem) => void
}) {
  const { page, setPage, pageCount, slice, total } = usePaged(rows)

  if (rows.length === 0) {
    return <p className="px-5 py-10 text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Position / Pool</TableHead>
              <TableHead>Age</TableHead>
              {mode === "open" ? <TableHead>Status</TableHead> : null}
              <TableHead>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex cursor-help items-center gap-1">
                        Invested
                        <HelpCircle className="size-3 text-muted-foreground" />
                      </span>
                    }
                  />
                  <TooltipContent className="max-w-xs">
                    Everything deposited by our transactions (Anchor event
                    amounts).
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              {mode === "open" ? (
                <>
                  <TableHead>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex cursor-help items-center gap-1">
                            Balance
                            <HelpCircle className="size-3 text-muted-foreground" />
                          </span>
                        }
                      />
                      <TooltipContent className="max-w-xs">
                        Deposited minus withdrawn, per token side.
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>Value</TableHead>
                </>
              ) : null}
              <TableHead>Total fee</TableHead>
              <TableHead>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex cursor-help items-center gap-1">
                        {mode === "open" ? "uPnL (SOL)" : "PnL (SOL)"}
                        <HelpCircle className="size-3 text-muted-foreground" />
                      </span>
                    }
                  />
                  <TooltipContent className="max-w-xs">
                    {SOL_PNL_TIP}
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              {mode === "open" ? (
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex cursor-help items-center gap-1">
                          DPR
                          <HelpCircle className="size-3 text-muted-foreground" />
                        </span>
                      }
                    />
                    <TooltipContent className="max-w-xs">
                      {DPR_TIP}
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              ) : null}
              <TableHead>Leader</TableHead>
              <TableHead>Execution</TableHead>
              {mode === "open" ? <TableHead>Range</TableHead> : null}
              {mode === "closed" ? <TableHead>Closed</TableHead> : null}
              <TableHead className="pr-5">Opened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((row) => {
              const pool = row.pool ? pools[row.pool] : undefined
              const flows = flowsFor(row)
              return (
                <TableRow
                  key={`${mode}-${row.id}`}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={(e) => {
                    const t = e.target as HTMLElement
                    if (t.closest("a,button")) return
                    onSelect(row)
                  }}
                >
                  <TableCell className="pl-5">
                    <PoolCell row={row} pool={pool} />
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {formatAge(
                      row.opened_at,
                      mode === "closed" ? row.closed_at : null,
                    )}
                  </TableCell>
                  {mode === "open" ? (
                    <TableCell>
                      <StatusBadge status={statusTone(row.status || "unknown")} />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <FlowAmountCell
                      amountX={flows?.depositX}
                      amountY={flows?.depositY}
                      pool={pool}
                      flows={flows}
                      enabled={metricsEnabled}
                      estimateWarning
                    />
                  </TableCell>
                  {mode === "open" ? (
                    <>
                      <TableCell>
                        <FlowAmountCell
                          amountX={flows?.netDepositedX}
                          amountY={flows?.netDepositedY}
                          pool={pool}
                          flows={flows}
                          enabled={metricsEnabled}
                          estimateWarning
                        />
                      </TableCell>
                      <TableCell>
                        <MetricSoon tip={VALUE_TIP} />
                      </TableCell>
                    </>
                  ) : null}
                  <TableCell>
                    <FlowAmountCell
                      amountX={flows?.feeClaimedX}
                      amountY={flows?.feeClaimedY}
                      pool={pool}
                      flows={flows}
                      enabled={metricsEnabled}
                    />
                  </TableCell>
                  <TableCell>
                    <SolPnlCell
                      metrics={solFor(row)}
                      flows={flows}
                      enabled={metricsEnabled}
                      pricing={pricing}
                    />
                  </TableCell>
                  {mode === "open" ? (
                    <TableCell>
                      <MetricSoon tip={DPR_TIP} />
                    </TableCell>
                  ) : null}
                  <TableCell className="tabular">
                    {row.source_owner ? (
                      <WalletLink address={row.source_owner} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="tabular">
                    {row.execution_wallet ? (
                      <WalletLink address={row.execution_wallet} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {mode === "open" ? (
                    <TableCell>
                      <RangeBar
                        lower={row.bin_lower ?? flows?.binLower}
                        upper={row.bin_upper ?? flows?.binUpper}
                      />
                    </TableCell>
                  ) : null}
                  {mode === "closed" ? (
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeClosed(row.closed_at)}
                    </TableCell>
                  ) : null}
                  <TableCell className="pr-5 text-xs text-muted-foreground">
                    {formatWhen(row.opened_at)}
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow className="bg-muted/20 font-medium">
              <TableCell className="pl-5">Total</TableCell>
              <TableCell colSpan={20} className="pr-5 text-muted-foreground">
                {total} position{total === 1 ? "" : "s"} · {PAGE_SIZE} per page
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <PaginationBar
        page={page}
        pageCount={pageCount}
        total={total}
        onPage={setPage}
      />
    </>
  )
}

function PositionCards({
  rows,
  mode,
  empty,
  pools,
  flowsFor,
  solFor,
  metricsEnabled,
  onSelect,
}: {
  rows: PositionListItem[]
  mode: "open" | "closed"
  empty: string
  pools: Record<string, CachedDlmmPool>
  flowsFor: (row: PositionListItem) => PositionFlows | undefined
  solFor: (row: PositionListItem) => SolMetrics | null
  metricsEnabled: boolean
  onSelect: (row: PositionListItem) => void
}) {
  const { page, setPage, pageCount, slice, total } = usePaged(rows)
  if (rows.length === 0) {
    return <p className="px-5 py-10 text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {slice.map((row) => {
          const pool = row.pool ? pools[row.pool] : undefined
          const flows = flowsFor(row)
          const amounts = (x?: bigint, y?: bigint, signed?: boolean) =>
            !metricsEnabled || !flows || x == null || y == null
              ? "—"
              : formatPairAmounts(x, y, pool, { signed })
          return (
            <button
              type="button"
              key={row.id}
              onClick={() => onSelect(row)}
              className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30"
            >
              <PoolCell row={row} pool={pool} />
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <SummaryStat
                  label="Age"
                  value={formatAge(row.opened_at, row.closed_at)}
                />
                <SummaryStat label="Status" value={row.status || "—"} />
                <SummaryStat
                  label="Invested"
                  value={amounts(flows?.depositX, flows?.depositY)}
                  tip={metricsEnabled ? undefined : FLOWS_OFF_TIP}
                />
                {mode === "open" ? (
                  <>
                    <SummaryStat
                      label="Balance"
                      value={amounts(flows?.netDepositedX, flows?.netDepositedY)}
                      tip={metricsEnabled ? undefined : FLOWS_OFF_TIP}
                    />
                    <SummaryStat label="Value" value="—" tip={VALUE_TIP} />
                  </>
                ) : null}
                <SummaryStat
                  label="Total fee"
                  value={amounts(flows?.feeClaimedX, flows?.feeClaimedY)}
                  tip={metricsEnabled ? undefined : FLOWS_OFF_TIP}
                />
                <SummaryStat
                  label={mode === "open" ? "uPnL (SOL)" : "PnL (SOL)"}
                  value={
                    !metricsEnabled
                      ? "—"
                      : (() => {
                          const sol = solFor(row)
                          return sol
                            ? formatSol(sol.pnlSol, { signed: true })
                            : "—"
                        })()
                  }
                  tip={metricsEnabled ? SOL_PNL_TIP : FLOWS_OFF_TIP}
                />
                {mode === "open" ? (
                  <SummaryStat label="DPR" value="—" tip={DPR_TIP} />
                ) : null}
              </div>
              {mode === "open" ? (
                <div className="mt-3">
                  <RangeBar
                    lower={row.bin_lower ?? flows?.binLower}
                    upper={row.bin_upper ?? flows?.binUpper}
                  />
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
      <PaginationBar
        page={page}
        pageCount={pageCount}
        total={total}
        onPage={setPage}
      />
    </>
  )
}

export function PositionsSection() {
  const { wallets: trackingWallets, loading: trackingLoading } = useWalletsData()
  const { wallets: tradingWallets, loading: tradingLoading } = useTradingWallets()

  const [scope, setScope] = useState<WalletScope>("all")
  const [walletFilter, setWalletFilter] = useState<string>("all")
  const [copyOnly, setCopyOnly] = useState(false)
  const [hideEmptyBins, setHideEmptyBins] = useState(false)
  const [view, setView] = useState<ViewMode>("table")
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<PositionListItem[]>([])
  const [closed, setClosed] = useState<PositionListItem[]>([])
  /** Positions from chain extraction that no strategy mapping covers */
  const [extracted, setExtracted] = useState<PositionListItem[]>([])
  const [pools, setPools] = useState<Record<string, CachedDlmmPool>>({})
  const [selected, setSelected] = useState<PositionListItem | null>(null)
  const [metricsEnabled, setMetricsEnabled] = useState(true)
  const [scanLimit, setScanLimit] = useState<number>(SCAN_LIMITS[0])
  const [flows, setFlows] = useState<Record<string, PositionFlows>>({})
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [flowsError, setFlowsError] = useState<string | null>(null)
  const [flowSummaries, setFlowSummaries] = useState<WalletFlowsSummary[]>([])
  const [prices, setPrices] = useState<PriceMap>({})
  const [pricing, setPricing] = useState(false)

  const trackingSet = useMemo(
    () => new Set(trackingWallets.map((w) => w.address.trim()).filter(Boolean)),
    [trackingWallets],
  )
  const tradingSet = useMemo(
    () => new Set(tradingWallets.map((w) => w.address.trim()).filter(Boolean)),
    [tradingWallets],
  )

  const walletOptions = useMemo(() => {
    const opts: { address: string; label: string; role: PositionWalletRole }[] =
      []
    for (const w of trackingWallets) {
      opts.push({
        address: w.address,
        label: w.name?.trim() || truncateAddress(w.address, 4),
        role: roleForAddress(w.address, trackingSet, tradingSet),
      })
    }
    for (const w of tradingWallets) {
      if (trackingSet.has(w.address.trim())) continue
      opts.push({
        address: w.address,
        label: w.label?.trim() || truncateAddress(w.address, 4),
        role: "trading",
      })
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label))
  }, [trackingWallets, tradingWallets, trackingSet, tradingSet])

  const addressesToFetch = useMemo(() => {
    if (scope === "wallet") {
      if (walletFilter === "all") return []
      return [walletFilter]
    }
    if (scope === "tracking") return [...trackingSet]
    if (scope === "trading") return [...tradingSet]
    return [...new Set([...trackingSet, ...tradingSet])]
  }, [scope, walletFilter, trackingSet, tradingSet])

  const enrichPoolMeta = useCallback(async (rows: PositionListItem[]) => {
    const addresses = [
      ...new Set(
        rows
          .map((r) => r.pool?.trim())
          .filter((a): a is string => Boolean(a)),
      ),
    ]
    if (!addresses.length) return
    setEnriching(true)
    try {
      const res = await fetch("/api/pools/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addresses }),
      })
      const json = (await res.json().catch(() => null)) as {
        pools?: Record<string, CachedDlmmPool>
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(json?.error || `Pool enrich failed (${res.status})`)
      }
      setPools((prev) => ({ ...prev, ...(json?.pools ?? {}) }))
    } catch (err) {
      console.warn(err)
      // Keep positions visible even if enrichment fails (e.g. migration pending)
    } finally {
      setEnriching(false)
    }
  }, [])

  const loadFlows = useCallback(
    async (addresses: string[]) => {
      if (!metricsEnabled || addresses.length === 0) {
        setFlows({})
        setExtracted([])
        setFlowSummaries([])
        setFlowsError(null)
        return
      }
      setFlowsLoading(true)
      setFlowsError(null)
      try {
        const results = await Promise.allSettled(
          addresses.map((addr) =>
            fetchWalletFlows(addr, {
              limit: scanLimit,
              concurrency: 8,
              filterWatchlist: false,
            }),
          ),
        )
        const merged: PositionFlows[] = []
        const summaries: WalletFlowsSummary[] = []
        const rows: PositionListItem[] = []
        const errors: string[] = []
        results.forEach((res, i) => {
          if (res.status === "rejected") {
            errors.push(
              `${truncateAddress(addresses[i], 4)}: ${
                res.reason instanceof Error ? res.reason.message : "failed"
              }`,
            )
            return
          }
          const wallet = addresses[i]
          const role = roleForAddress(wallet, trackingSet, tradingSet)
          merged.push(...res.value.positions)
          rows.push(
            ...res.value.positions.map((p) =>
              positionRowFromFlows(p, wallet, role),
            ),
          )
          summaries.push(res.value.summary)
        })
        setFlows(indexFlowsByPosition(merged))
        setExtracted(rows)
        setFlowSummaries(summaries)
        setFlowsError(
          errors.length ? `Metrics: ${errors.slice(0, 2).join(" · ")}` : null,
        )
      } catch (err) {
        setFlows({})
        setExtracted([])
        setFlowSummaries([])
        setFlowsError(
          err instanceof Error ? err.message : "Failed to extract metrics",
        )
      } finally {
        setFlowsLoading(false)
      }
    },
    [metricsEnabled, scanLimit, trackingSet, tradingSet],
  )

  const refresh = useCallback(async () => {
    if (addressesToFetch.length === 0) {
      setOpen([])
      setClosed([])
      setPools({})
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.allSettled(
        addressesToFetch.map((addr) => fetchPositionsForWallet(addr)),
      )
      const openAcc: PositionListItem[] = []
      const closedAcc: PositionListItem[] = []
      const errors: string[] = []

      results.forEach((result, i) => {
        const queriedWallet = addressesToFetch[i]
        if (result.status === "rejected") {
          errors.push(
            `${truncateAddress(queriedWallet, 4)}: ${
              result.reason instanceof Error
                ? result.reason.message
                : "failed"
            }`,
          )
          return
        }
        const role = roleForAddress(queriedWallet, trackingSet, tradingSet)
        const tag = (
          row: (typeof result.value.open)[number],
        ): PositionListItem => ({
          ...row,
          queriedWallet,
          walletRole: role,
          isCopyTrade: Boolean(row.strategy_id),
        })
        openAcc.push(...result.value.open.map(tag))
        closedAcc.push(...result.value.closed.map(tag))
      })

      const openRows = dedupePositions(openAcc)
      const closedRows = dedupePositions(closedAcc)
      setOpen(openRows)
      setClosed(closedRows)
      if (errors.length && openAcc.length + closedAcc.length === 0) {
        setError(errors.slice(0, 3).join(" · "))
      } else if (errors.length) {
        setError(`Some wallets failed: ${errors.slice(0, 2).join(" · ")}`)
      }
      void enrichPoolMeta([...openRows, ...closedRows])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load positions")
      setOpen([])
      setClosed([])
    } finally {
      setLoading(false)
    }
  }, [addressesToFetch, trackingSet, tradingSet, enrichPoolMeta])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void loadFlows(addressesToFetch)
  }, [addressesToFetch, loadFlows])

  useEffect(() => {
    if (extracted.length) void enrichPoolMeta(extracted)
  }, [extracted, enrichPoolMeta])

  // Value flows in SOL: every non-SOL amount needs the token and SOL price of
  // its own block time. Pools must be enriched first for the mints.
  useEffect(() => {
    const requests: PriceRequest[] = []
    for (const flow of Object.values(flows)) {
      const pool = flow.pool ? pools[flow.pool] : undefined
      if (!pool) continue
      requests.push(...priceRequestsForFlows(flow, pool))
    }
    if (!requests.length) return
    const controller = new AbortController()
    setPricing(true)
    void fetchPricesAt(requests, {
      signal: controller.signal,
      onChunk: (chunk) => setPrices((prev) => ({ ...prev, ...chunk })),
    })
      .catch((err) => {
        if (controller.signal.aborted) return
        setFlowsError(
          err instanceof Error ? `Prices: ${err.message}` : "Price lookup failed",
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setPricing(false)
      })
    return () => controller.abort()
  }, [flows, pools])

  const solFor = useCallback(
    (row: PositionListItem) => {
      const own = row.user_position?.trim()
      const leader = row.source_position?.trim()
      const flow =
        (own ? flows[own] : undefined) ?? (leader ? flows[leader] : undefined)
      if (!flow) return null
      const pool = flow.pool ? pools[flow.pool] : undefined
      return solMetricsForFlows(flow, pool, prices)
    },
    [flows, pools, prices],
  )

  const flowsFor = useCallback(
    (row: PositionListItem) => {
      const own = row.user_position?.trim()
      const leader = row.source_position?.trim()
      return (own ? flows[own] : undefined) ?? (leader ? flows[leader] : undefined)
    },
    [flows],
  )

  const filterRows = useCallback(
    (rows: PositionListItem[]) => {
      let next = rows
      if (copyOnly) next = next.filter((r) => r.isCopyTrade)
      if (scope === "tracking") {
        next = next.filter(
          (r) =>
            (r.source_owner && trackingSet.has(r.source_owner.trim())) ||
            (r.execution_wallet && trackingSet.has(r.execution_wallet.trim())) ||
            trackingSet.has(r.queriedWallet.trim()),
        )
      }
      if (scope === "trading") {
        next = next.filter(
          (r) =>
            (r.execution_wallet && tradingSet.has(r.execution_wallet.trim())) ||
            tradingSet.has(r.queriedWallet.trim()),
        )
      }
      if (scope === "wallet" && walletFilter !== "all") {
        const w = walletFilter.trim()
        next = next.filter(
          (r) =>
            r.queriedWallet === w ||
            r.source_owner === w ||
            r.execution_wallet === w,
        )
      }
      if (hideEmptyBins) {
        next = next.filter((r) => r.bin_lower != null && r.bin_upper != null)
      }
      return next
    },
    [copyOnly, scope, walletFilter, trackingSet, tradingSet, hideEmptyBins],
  )

  /** Mapped rows win over extracted ones; they carry the strategy context. */
  const mergeExtracted = useCallback(
    (mapped: PositionListItem[], wantClosed: boolean) => {
      const known = new Set<string>()
      for (const row of [...open, ...closed]) {
        const own = row.user_position?.trim()
        const leader = row.source_position?.trim()
        if (own) known.add(own)
        if (leader) known.add(leader)
      }
      const extra = extracted.filter((row) => {
        const addr = (row.user_position || row.source_position || "").trim()
        if (!addr || known.has(addr)) return false
        return (row.status === "closed") === wantClosed
      })
      return [...mapped, ...extra]
    },
    [open, closed, extracted],
  )

  const openFiltered = useMemo(
    () => filterRows(mergeExtracted(open, false)),
    [filterRows, mergeExtracted, open],
  )
  const closedFiltered = useMemo(
    () => filterRows(mergeExtracted(closed, true)),
    [filterRows, mergeExtracted, closed],
  )

  const walletsLoading = trackingLoading || tradingLoading
  const uniquePools = useMemo(() => {
    const s = new Set(
      [...openFiltered, ...closedFiltered]
        .map((r) => r.pool)
        .filter(Boolean) as string[],
    )
    return s.size
  }, [openFiltered, closedFiltered])

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <SectionHeader
          title="Positions"
          description="Open and historical LP positions — pool metadata from Meteora DLMM + DexScreener images (cached in Supabase)."
        >
          <Button
            variant="outline"
            size="lg"
            disabled={loading || walletsLoading || enriching}
            onClick={() => void refresh()}
          >
            <RefreshCw
              data-icon="inline-start"
              className={cn((loading || enriching) && "animate-spin")}
            />
            Refresh
          </Button>
        </SectionHeader>

        {error ? (
          <p
            role="alert"
            className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        {flowsError ? (
          <p
            role="alert"
            className="border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
          >
            {flowsError}
          </p>
        ) : null}

        <Card className="py-4">
          <CardContent className="flex flex-col gap-4 px-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="size-4" />
                Wallet scope
              </div>
              <ToggleGroup
                value={[scope]}
                onValueChange={(value) => {
                  const next = value[0] as WalletScope | undefined
                  if (!next) return
                  setScope(next)
                  if (next !== "wallet") setWalletFilter("all")
                }}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="all">All wallets</ToggleGroupItem>
                <ToggleGroupItem value="tracking">Tracking</ToggleGroupItem>
                <ToggleGroupItem value="trading">Trading</ToggleGroupItem>
                <ToggleGroupItem value="wallet">Single wallet</ToggleGroupItem>
              </ToggleGroup>

              {scope === "wallet" ? (
                <Select
                  value={walletFilter === "all" ? undefined : walletFilter}
                  onValueChange={(v) => setWalletFilter(String(v ?? "all"))}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Select wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletOptions.map((w) => (
                      <SelectItem key={w.address} value={w.address}>
                        {w.label} · {w.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2.5 text-sm">
                <Switch
                  checked={metricsEnabled}
                  onCheckedChange={setMetricsEnabled}
                />
                Metrics from chain
              </label>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="inline-flex cursor-help text-muted-foreground">
                      <HelpCircle className="size-3.5" />
                    </span>
                  }
                />
                <TooltipContent className="max-w-xs">
                  Invested, balance, fees and PnL are extracted from our own
                  transaction instruction data (Anchor CPI events) — not from the
                  Meteora API, which only enriches pool metadata.
                </TooltipContent>
              </Tooltip>
              {metricsEnabled ? (
                <Select
                  value={String(scanLimit)}
                  onValueChange={(v) => setScanLimit(Number(v ?? SCAN_LIMITS[0]))}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Scan depth" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCAN_LIMITS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Last {n} txs / wallet
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {metricsEnabled && flowSummaries.length ? (
                <span className="text-xs text-muted-foreground tabular">
                  {flowsLoading
                    ? "extracting…"
                    : `${flowSummaries.reduce(
                        (a, s) => a + s.flowEventCount,
                        0,
                      )} flow events · ${flowSummaries.reduce(
                        (a, s) => a + s.txWithLp,
                        0,
                      )} LP txs · ${flowSummaries.reduce(
                        (a, s) => a + s.txReverted,
                        0,
                      )} reverted skipped`}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-2.5 text-sm">
                <Switch checked={copyOnly} onCheckedChange={setCopyOnly} />
                Copy trade positions only
              </label>
              <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Switch
                  checked={hideEmptyBins}
                  onCheckedChange={setHideEmptyBins}
                />
                Hide positions without range
              </label>
              <ToggleGroup
                value={[view]}
                onValueChange={(value) => {
                  const next = value[0]
                  if (next === "table" || next === "card") setView(next)
                }}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="card" aria-label="Card view">
                  <LayoutGrid className="size-4" />
                  Card
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Table view">
                  <TableIcon className="size-4" />
                  Table
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        <Card className="py-0">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Open positions</h2>
              <p className="text-xs text-muted-foreground">
                {walletsLoading || loading
                  ? "Loading…"
                  : `${openFiltered.length} open · ${PAGE_SIZE}/page${
                      enriching ? " · enriching pools…" : ""
                    }`}
              </p>
            </div>
            <div className="flex flex-wrap gap-6">
              <SummaryStat label="Open" value={openFiltered.length} />
              <SummaryStat label="Pools" value={uniquePools} />
              <SummaryStat
                label="With flow data"
                value={
                  metricsEnabled
                    ? openFiltered.filter((r) => flowsFor(r)).length
                    : "—"
                }
                tip={
                  metricsEnabled
                    ? "Positions whose amounts we extracted from instruction data in the scanned window."
                    : FLOWS_OFF_TIP
                }
              />
              <SummaryStat
                label="Total value"
                value="—"
                tip={VALUE_TIP}
              />
              <SummaryStat label="Total uPnL" value="—" tip={METRICS_TIP} />
            </div>
          </div>
          <CardContent className="px-0 pb-0">
            {view === "table" ? (
              <PositionsDataTable
                rows={openFiltered}
                mode="open"
                pools={pools}
                flowsFor={flowsFor}
                solFor={solFor}
                metricsEnabled={metricsEnabled}
                pricing={pricing}
                onSelect={setSelected}
                empty={
                  walletsLoading || loading
                    ? "Loading positions…"
                    : addressesToFetch.length === 0
                      ? "Add tracking or trading wallets to see positions."
                      : "No open positions for the current filters."
                }
              />
            ) : (
              <PositionCards
                rows={openFiltered}
                mode="open"
                pools={pools}
                flowsFor={flowsFor}
                solFor={solFor}
                metricsEnabled={metricsEnabled}
                onSelect={setSelected}
                empty={
                  loading
                    ? "Loading…"
                    : "No open positions for the current filters."
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Historical positions</h2>
              <p className="text-xs text-muted-foreground">
                {closedFiltered.length} closed · {PAGE_SIZE}/page
              </p>
            </div>
          </div>
          <CardContent className="px-0 pb-0">
            {view === "table" ? (
              <PositionsDataTable
                rows={closedFiltered}
                mode="closed"
                pools={pools}
                flowsFor={flowsFor}
                solFor={solFor}
                metricsEnabled={metricsEnabled}
                pricing={pricing}
                onSelect={setSelected}
                empty={
                  loading
                    ? "Loading…"
                    : "No historical positions for the current filters."
                }
              />
            ) : (
              <PositionCards
                rows={closedFiltered}
                mode="closed"
                pools={pools}
                flowsFor={flowsFor}
                solFor={solFor}
                metricsEnabled={metricsEnabled}
                onSelect={setSelected}
                empty={
                  loading
                    ? "Loading…"
                    : "No historical positions for the current filters."
                }
              />
            )}
          </CardContent>
        </Card>

        <PositionDetailDialog
          position={selected}
          pool={
            selected?.pool ? pools[selected.pool] : undefined
          }
          flows={selected ? flowsFor(selected) : undefined}
          solMetrics={selected ? solFor(selected) : null}
          flowsEnabled={metricsEnabled}
          open={Boolean(selected)}
          onOpenChange={(next) => {
            if (!next) setSelected(null)
          }}
        />
      </div>
    </TooltipProvider>
  )
}
