"use client"

import { useEffect, useState } from "react"
import {
  Copy,
  ExternalLink,
  Flag,
  HelpCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatusBadge } from "@/components/dashboard/primitives"
import { WalletLink } from "@/components/wallet/wallet-link"
import {
  listCopyTradesForPosition,
  type CopyTradeExecution,
} from "@/lib/copy-trades/api"
import type { CachedDlmmPool } from "@/lib/pools/meteora-cache"
import {
  formatAge,
  formatRelativeClosed,
  protocolLabel,
  type PositionListItem,
} from "@/lib/positions/api"
import {
  amountSourceLabel,
  flowKindLabel,
  formatPairAmounts,
  type PositionFlowEvent,
  type PositionFlows,
} from "@/lib/positions/flows"
import { formatSol, type SolMetrics } from "@/lib/positions/sol-value"
import { createClient } from "@/lib/supabase/client"
import { cn, copyToClipboard, truncateAddress } from "@/lib/utils"

function solscanTx(sig: string) {
  return `https://solscan.io/tx/${sig}`
}

function actionLabel(action?: string | null) {
  const a = (action || "").toLowerCase()
  if (a === "add" || a === "add_liquidity") return "Add Liquidity"
  if (a === "remove" || a === "remove_liquidity") return "Remove Liquidity"
  if (a === "claim_fee" || a === "claim") return "Claim Fee"
  if (a === "open" || a === "open_position") return "Open Position"
  if (a === "close" || a === "close_position") return "Close Position"
  if (a === "rebalance") return "Rebalance"
  if (!a) return "—"
  return action!.replace(/_/g, " ")
}

function actionTone(action?: string | null) {
  const a = (action || "").toLowerCase()
  if (a.includes("remove") || a.includes("close")) {
    return "border-danger/40 bg-danger/10 text-danger"
  }
  if (a.includes("claim")) {
    return "border-chart-4/40 bg-chart-4/15 text-chart-4"
  }
  if (a.includes("add") || a.includes("open")) {
    return "border-success/40 bg-success/10 text-success"
  }
  return "border-border bg-muted/40 text-muted-foreground"
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: "success" | "danger" | "muted"
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 px-4 py-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {hint ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex cursor-help">
                  <HelpCircle className="size-3 opacity-60" />
                </span>
              }
            />
            <TooltipContent className="max-w-xs">{hint}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-1.5 text-sm font-semibold tabular",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  )
}

function TxCell({
  signature,
  label,
}: {
  signature?: string | null
  label?: string
}) {
  if (!signature) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-col gap-0.5">
      {label ? (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="flex items-center gap-1">
        <a
          href={solscanTx(signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs hover:underline"
        >
          {truncateAddress(signature, 4)}
          <ExternalLink className="size-3 text-muted-foreground" />
        </a>
        <button
          type="button"
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Copy signature"
          onClick={() => void copyToClipboard(signature)}
        >
          <Copy className="size-3" />
        </button>
      </div>
    </div>
  )
}

function SlotCompare({ trade }: { trade: CopyTradeExecution }) {
  const leader = trade.sourceSlot
  const copy = trade.userSlot
  const delta =
    leader != null && copy != null && Number.isFinite(leader) && Number.isFinite(copy)
      ? copy - leader
      : null

  return (
    <div className="space-y-1 text-xs tabular">
      <div>
        <span className="text-muted-foreground">Leader </span>
        {leader != null ? leader.toLocaleString() : "—"}
      </div>
      <div>
        <span className="text-muted-foreground">Copy </span>
        {copy != null ? copy.toLocaleString() : "—"}
      </div>
      {delta != null ? (
        <div className="text-muted-foreground">Δ {delta} slots</div>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex cursor-help text-muted-foreground">
                slots soon
              </span>
            }
          />
          <TooltipContent>
            Leader/copy slot columns need backend write (source_slot /
            user_slot).
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

const METRIC_MISSING_HINT =
  "Extracted from our own transaction instruction data — enable “Metrics from chain” and make sure the scan window covers this position."

function slotTime(event: PositionFlowEvent) {
  if (event.blockTime == null) return "—"
  return new Date(event.blockTime * 1000).toLocaleString("en-GB", {
    hour12: false,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function FlowHistoryTable({
  flows,
  pool,
  enabled,
}: {
  flows?: PositionFlows
  pool?: CachedDlmmPool
  enabled: boolean
}) {
  if (!enabled) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        Turn on “Metrics from chain” to extract this position&apos;s flows from
        instruction data.
      </p>
    )
  }
  if (!flows || flows.events.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        No decoded flows for this position in the scanned window — increase the
        scan depth on the Positions page.
      </p>
    )
  }
  const events = [...flows.events].sort((a, b) => b.slot - a.slot)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">TX</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Amounts</TableHead>
          <TableHead>Slot</TableHead>
          <TableHead>Slot time</TableHead>
          <TableHead className="pr-4">Bin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={`${event.signature}-${event.ixIndex}-${event.kind}`}>
            <TableCell className="pl-4 align-top">
              <TxCell signature={event.signature} />
            </TableCell>
            <TableCell className="align-top">
              <span
                className={cn(
                  "inline-flex rounded-md border px-2 py-1 text-[11px] font-medium",
                  actionTone(event.kind),
                )}
              >
                {flowKindLabel(event.kind)}
              </span>
            </TableCell>
            <TableCell className="align-top tabular">
              {event.source === "ix_args" ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="cursor-help text-warning">
                        {formatPairAmounts(event.amountX, event.amountY, pool)}
                      </span>
                    }
                  />
                  <TooltipContent className="max-w-xs">
                    {amountSourceLabel(event.source)}
                  </TooltipContent>
                </Tooltip>
              ) : (
                formatPairAmounts(event.amountX, event.amountY, pool)
              )}
            </TableCell>
            <TableCell className="align-top tabular">
              {event.slot.toLocaleString()}
            </TableCell>
            <TableCell className="align-top text-xs text-muted-foreground">
              {slotTime(event)}
            </TableCell>
            <TableCell className="pr-4 align-top tabular text-muted-foreground">
              {event.activeBinId ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function PositionDetailDialog({
  position,
  pool,
  flows,
  solMetrics,
  flowsEnabled = false,
  open,
  onOpenChange,
}: {
  position: PositionListItem | null
  pool?: CachedDlmmPool
  flows?: PositionFlows
  solMetrics?: SolMetrics | null
  flowsEnabled?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [trades, setTrades] = useState<CopyTradeExecution[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !position) {
      setTrades([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const supabase = createClient()
        const rows = await listCopyTradesForPosition(supabase, {
          strategyId: position.strategy_id,
          poolAddress: position.pool,
          limit: 80,
        })
        if (!cancelled) setTrades(rows)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load copy trades",
          )
          setTrades([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, position])

  const title =
    pool?.name ||
    (pool?.tokenX.symbol && pool?.tokenY.symbol
      ? `${pool.tokenX.symbol} / ${pool.tokenY.symbol}`
      : position?.pool
        ? truncateAddress(position.pool, 4)
        : "Position")

  const age = position
    ? formatAge(position.opened_at, position.closed_at)
    : "—"

  const flowMetric = flowsEnabled && Boolean(flows)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-2">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="font-mono text-sm">
                  {position?.user_position
                    ? truncateAddress(position.user_position, 4)
                    : title}
                </span>
                <Badge
                  variant="secondary"
                  className="h-5 rounded-sm bg-chart-3/15 px-1.5 text-[10px] font-semibold text-chart-3"
                >
                  {protocolLabel(position?.protocol)}
                </Badge>
                {position?.status ? (
                  <StatusBadge
                    status={
                      position.status === "open"
                        ? "Active"
                        : position.status === "closed"
                          ? "Skipped"
                          : position.status
                    }
                  />
                ) : null}
                {position?.status === "closed" ? (
                  <Badge variant="destructive" className="h-5 rounded-full px-2">
                    Close
                  </Badge>
                ) : null}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>{title}</span>
                {position?.pool ? (
                  <WalletLink address={position.pool} chars={4} />
                ) : null}
                {position?.isCopyTrade ? (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    Copy trading
                  </Badge>
                ) : null}
              </DialogDescription>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>
                  Leader{" "}
                  {position?.source_owner ? (
                    <WalletLink address={position.source_owner} />
                  ) : (
                    "—"
                  )}
                </span>
                <span>
                  Exec{" "}
                  {position?.execution_wallet ? (
                    <WalletLink address={position.execution_wallet} />
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Flag className="size-3.5 text-danger" />
              Report
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={
                position?.closed_at
                  ? "Profit and loss (SOL)"
                  : "PnL realised (SOL)"
              }
              value={
                solMetrics ? formatSol(solMetrics.pnlSol, { signed: true }) : "—"
              }
              hint={
                solMetrics
                  ? `Each amount valued in SOL at its own block time. In ${formatSol(
                      solMetrics.investedSol,
                    )} · out ${formatSol(solMetrics.withdrawnSol)} · fees ${formatSol(
                      solMetrics.feesSol,
                    )}. Per token: ${formatPairAmounts(
                      flows!.pnlX,
                      flows!.pnlY,
                      pool,
                      { signed: true },
                    )}${
                      solMetrics.unpricedSides > 0
                        ? ` · ${solMetrics.unpricedSides} amount(s) without a historical price`
                        : ""
                    }`
                  : flowMetric
                    ? "Waiting for historical token prices to value this position in SOL."
                    : METRIC_MISSING_HINT
              }
              tone={
                solMetrics
                  ? solMetrics.pnlSol > 0
                    ? "success"
                    : solMetrics.pnlSol < 0
                      ? "danger"
                      : undefined
                  : "muted"
              }
            />
            <MetricCard label="Age" value={age} />
            <MetricCard
              label="Fees claimed"
              value={
                flowMetric
                  ? formatPairAmounts(flows!.feeClaimedX, flows!.feeClaimedY, pool)
                  : "—"
              }
              hint={
                flowMetric
                  ? `${flows!.claimFeeCount} claim${
                      flows!.claimFeeCount === 1 ? "" : "s"
                    } decoded from ClaimFee events.`
                  : METRIC_MISSING_HINT
              }
              tone={flowMetric ? undefined : "muted"}
            />
            <MetricCard
              label="Invested"
              value={
                flowMetric
                  ? formatPairAmounts(flows!.depositX, flows!.depositY, pool)
                  : "—"
              }
              hint={
                flowMetric
                  ? `${flows!.addCount} add${
                      flows!.addCount === 1 ? "" : "s"
                    }, ${flows!.removeCount} removal${
                      flows!.removeCount === 1 ? "" : "s"
                    }. Balance still in: ${formatPairAmounts(
                      flows!.netDepositedX,
                      flows!.netDepositedY,
                      pool,
                    )}`
                  : METRIC_MISSING_HINT
              }
              tone={flowMetric ? undefined : "muted"}
            />
          </div>

          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold">
                History · Extracted flows
              </h3>
              <p className="text-xs text-muted-foreground">
                Every decoded Meteora action for this position with slot and slot
                time — amounts from instruction data.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <FlowHistoryTable
                flows={flows}
                pool={pool}
                enabled={flowsEnabled}
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">History · Copy trading</h3>
                <p className="text-xs text-muted-foreground">
                  Leader TX vs copy TX side-by-side (slot + latency for exact
                  compare).
                </p>
              </div>
              {position?.closed_at ? (
                <span className="text-xs text-muted-foreground">
                  Closed {formatRelativeClosed(position.closed_at)}
                </span>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="mb-3 border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Leader TX</TableHead>
                    <TableHead>Copy TX</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="inline-flex cursor-help items-center gap-1">
                              Slots
                              <HelpCircle className="size-3 text-muted-foreground" />
                            </span>
                          }
                        />
                        <TooltipContent className="max-w-xs">
                          Leader txn slot vs copy txn slot (Δ slots). Backend
                          fills source_slot / user_slot.
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="inline-flex cursor-help items-center gap-1">
                              Slot time
                              <HelpCircle className="size-3 text-muted-foreground" />
                            </span>
                          }
                        />
                        <TooltipContent className="max-w-xs">
                          Copy latency (ms) between leader event and follower
                          send — proxy until slot timestamps land.
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Total value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="px-4 py-8 text-muted-foreground"
                      >
                        Loading copy history…
                      </TableCell>
                    </TableRow>
                  ) : trades.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="px-4 py-8 text-muted-foreground"
                      >
                        No copy-trade executions for this position yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    trades.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="pl-4 align-top">
                          <TxCell
                            signature={t.sourceSignature}
                            label="Leader"
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <TxCell
                            signature={t.userSignature}
                            label="Copy"
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-1 text-[11px] font-medium",
                              actionTone(t.action),
                            )}
                          >
                            {actionLabel(t.action)}
                          </span>
                        </TableCell>
                        <TableCell className="align-top">
                          <SlotCompare trade={t} />
                        </TableCell>
                        <TableCell className="align-top tabular text-muted-foreground">
                          {t.latencyMs != null
                            ? `${t.latencyMs.toLocaleString()} ms`
                            : "—"}
                        </TableCell>
                        <TableCell className="align-top text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span className="cursor-help">—</span>
                              }
                            />
                            <TooltipContent>
                              Token balances per TX need backend enrichment.
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="align-top text-muted-foreground">
                          {t.amountUsd != null
                            ? `$${t.amountUsd.toFixed(2)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="align-top capitalize">
                          <StatusBadge
                            status={
                              t.status === "confirmed"
                                ? "Active"
                                : t.status === "failed"
                                  ? "Failed"
                                  : t.status === "skipped"
                                    ? "Skipped"
                                    : "Pending"
                            }
                          />
                        </TableCell>
                        <TableCell className="pr-4 align-top text-xs text-muted-foreground">
                          {formatRelativeClosed(t.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
