"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  LayoutGrid,
  LineChart,
  Loader2,
  RefreshCw,
  Table2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { PortfolioMode } from "@/lib/meteora/portfolio"
import {
  presentPositionEvents,
  type PositionEvent,
} from "@/lib/meteora/position-events"
import { SOL_MINT } from "@/lib/prices/token-prices"
import {
  PROTOCOL_LABEL,
  positionAgeSeconds,
  positionDpr,
  type WalletPosition,
} from "@/lib/meteora/types"
import {
  formatAge,
  formatRelative,
  formatSolCompact,
  formatToken,
  ratioPct,
} from "@/lib/meteora/format"
import type {
  ProtocolFilter,
  WalletPositionsSlice,
} from "@/lib/meteora/wallet-positions"
import { cn, copyToClipboard, formatUsd, truncateAddress } from "@/lib/utils"

export const PAGE_SIZE = 12
const PREFETCH_PAGES = 3

function solscanAccount(address: string) {
  return `https://solscan.io/account/${address}`
}

function solscanTx(sig: string) {
  return `https://solscan.io/tx/${sig}`
}

function pairLabel(row: WalletPosition) {
  if (row.poolName) return row.poolName.replace("-", " / ")
  const x = row.tokenX.symbol || truncateAddress(row.tokenX.mint || "", 3)
  const y = row.tokenY.symbol || truncateAddress(row.tokenY.mint || "", 3)
  return `${x} / ${y}`
}

function TokenPairIcons({ row }: { row: WalletPosition }) {
  const icons = [row.tokenX, row.tokenY]
  return (
    <div className="relative flex size-9 shrink-0 items-center">
      {icons.map((token, i) => (
        <span
          key={i}
          className={cn(
            "absolute size-6 overflow-hidden rounded-full border border-border bg-muted",
            i === 0 ? "left-0 top-0" : "left-3.5 top-2",
          )}
        >
          {token.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={token.icon} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[9px] font-semibold text-muted-foreground">
              {(token.symbol || "?").slice(0, 2)}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

function ProtocolBadge({ protocol }: { protocol: WalletPosition["protocol"] }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        protocol === "dlmm"
          ? "bg-sky-500/15 text-sky-400"
          : "bg-orange-500/15 text-orange-400",
      )}
    >
      {PROTOCOL_LABEL[protocol]}
    </span>
  )
}

function PositionCell({ row }: { row: WalletPosition }) {
  return (
    <div className="flex items-center gap-3">
      <TokenPairIcons row={row} />
      <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{pairLabel(row)}</span>
          <ProtocolBadge protocol={row.protocol} />
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <a
            href={solscanAccount(row.position)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="tabular hover:text-foreground"
          >
            {truncateAddress(row.position, 4)}
          </a>
          {row.strategy ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/80">
              {row.strategy}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  )
}

function SignedSol({
  sol,
  pct,
}: {
  sol: number | null
  pct?: number | null
}) {
  if (sol == null) return <span className="text-muted-foreground">—</span>
  const tone =
    sol > 0 ? "text-primary" : sol < 0 ? "text-danger" : "text-muted-foreground"
  return (
    <div className={cn("flex flex-col items-end leading-tight tabular", tone)}>
      <span>{formatSolCompact(sol, { signed: true })}</span>
      {pct != null ? (
        <span className="text-[11px] opacity-80">
          {pct > 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
      ) : null}
    </div>
  )
}

function PctCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  const tone =
    value > 0 ? "text-primary" : value < 0 ? "text-danger" : "text-muted-foreground"
  return (
    <span className={cn("tabular", tone)}>
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  )
}

function SolStack({ sol, hint }: { sol: number | null; hint?: string | null }) {
  if (sol == null) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-col items-end leading-tight tabular">
      <span>{formatSolCompact(sol)}</span>
      {hint ? (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  )
}

function RangeSpark({ row }: { row: WalletPosition }) {
  if (row.minPrice == null || row.maxPrice == null || row.maxPrice <= row.minPrice) {
    return <span className="text-muted-foreground">—</span>
  }
  const span = row.maxPrice - row.minPrice
  const mark =
    row.poolActivePrice == null
      ? 50
      : Math.min(100, Math.max(0, ((row.poolActivePrice - row.minPrice) / span) * 100))
  const inRange = row.isOutOfRange === false
  return (
    <div className="flex min-w-[88px] flex-col gap-1">
      <div className="relative h-1.5 rounded-full bg-muted">
        <div
          className={cn(
            "absolute inset-y-0 rounded-full",
            inRange || row.isOutOfRange == null ? "bg-primary/70" : "bg-danger/60",
          )}
          style={{ left: "8%", right: "8%" }}
        />
        <span
          className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `${mark}%` }}
        />
      </div>
      {row.isOutOfRange != null ? (
        <span
          className={cn(
            "text-[10px]",
            row.isOutOfRange ? "text-danger" : "text-primary",
          )}
        >
          {row.isOutOfRange ? "Out of range" : "In range"}
        </span>
      ) : null}
    </div>
  )
}

const ACTION_STYLE: Record<string, string> = {
  add: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  open: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  remove: "border-red-500/40 bg-red-500/10 text-red-400",
  close: "border-red-500/40 bg-red-500/10 text-red-400",
  claim_fee: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  claim_reward: "border-amber-500/40 bg-amber-500/10 text-amber-400",
}

const ACTION_LABEL: Record<string, string> = {
  add: "Add Liquidity",
  remove: "Remove Liquidity",
  claim_fee: "Claim Fee",
  claim_reward: "Claim Reward",
  open: "Open Position",
  close: "Close Position",
}

function TokenLine({
  icon,
  symbol,
  amount,
  usd,
}: {
  icon: string | null
  symbol: string | null
  amount: number | null
  usd: number | null
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-3.5 overflow-hidden rounded-full bg-muted">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[7px] text-muted-foreground">
            {(symbol || "?").slice(0, 1)}
          </span>
        )}
      </span>
      <span className="tabular">{formatToken(amount)}</span>
      <span className="text-muted-foreground">
        {usd == null ? "" : formatUsd(usd)}
      </span>
    </div>
  )
}

function EventsTable({
  events,
  row,
}: {
  events: PositionEvent[]
  row: WalletPosition
}) {
  const rows = presentPositionEvents(events)
  if (!rows.length) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        No events reported for this position.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Tx Hash</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead className="text-right">Total Value</TableHead>
            <TableHead className="pr-4 text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => {
            const solSide =
              e.totalSol ??
              (row.tokenY.mint === SOL_MINT
                ? e.amountY
                : row.tokenX.mint === SOL_MINT
                  ? e.amountX
                  : null)
            return (
              <TableRow key={`${e.signature}-${e.ixIndex}`}>
                <TableCell className="pl-4 tabular">
                  <span className="inline-flex items-center gap-1.5">
                    <a
                      href={solscanTx(e.signature)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      {truncateAddress(e.signature, 4)}
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(e.signature)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Copy signature"
                    >
                      <Copy className="size-3" />
                    </button>
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      ACTION_STYLE[e.eventType] ??
                        "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {ACTION_LABEL[e.eventType] || e.eventType.replace(/_/g, " ")}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <TokenLine
                      icon={row.tokenX.icon}
                      symbol={row.tokenX.symbol}
                      amount={e.amountX}
                      usd={e.amountXUsd}
                    />
                    <TokenLine
                      icon={row.tokenY.icon}
                      symbol={row.tokenY.symbol}
                      amount={e.amountY}
                      usd={e.amountYUsd}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs tabular">
                  <div className="flex flex-col items-end leading-tight">
                    <span>{e.totalUsd == null ? "—" : formatUsd(e.totalUsd)}</span>
                    {solSide != null ? (
                      <span className="text-muted-foreground">
                        {formatToken(solSide)} SOL
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                  {formatRelative(e.blockTime)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

type EventState = {
  loading: boolean
  error: string | null
  events: PositionEvent[]
}

function openFee(row: WalletPosition) {
  if (row.feeSol == null && row.unclaimedFeeSol == null) return null
  return (row.feeSol ?? 0) + (row.unclaimedFeeSol ?? 0)
}

export function PortfolioTable({
  wallet,
  mode,
  protocol,
  title,
  onSlice,
}: {
  wallet: string
  mode: PortfolioMode
  protocol: ProtocolFilter
  title: string
  onSlice?: (slice: WalletPositionsSlice) => void
}) {
  const [page, setPage] = useState(1)
  const [slice, setSlice] = useState<WalletPositionsSlice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [events, setEvents] = useState<Record<string, EventState>>({})
  const [hideSmall, setHideSmall] = useState(false)
  const [view, setView] = useState<"table" | "card">("table")

  useEffect(() => {
    setPage(1)
  }, [protocol, wallet, mode])

  const load = useCallback(
    async (targetPage: number, refresh = false) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          wallet,
          mode,
          protocol,
          page: String(targetPage),
          pageSize: String(PAGE_SIZE),
          prefetch: String(PREFETCH_PAGES),
        })
        if (refresh) params.set("refresh", "1")
        const res = await fetch(`/api/meteora/positions?${params}`, {
          cache: "no-store",
        })
        const json = (await res.json().catch(() => null)) as
          | (WalletPositionsSlice & { error?: string })
          | null
        if (!res.ok || !json) {
          throw new Error(json?.error || `Positions failed (${res.status})`)
        }
        setSlice(json)
        onSlice?.(json)
      } catch (err) {
        setSlice(null)
        setError(err instanceof Error ? err.message : "Failed to load positions")
      } finally {
        setLoading(false)
      }
    },
    [mode, onSlice, protocol, wallet],
  )

  useEffect(() => {
    void load(page)
  }, [load, page])

  const rows = useMemo(() => {
    const all = slice?.rows ?? []
    if (!hideSmall || mode === "open") return all
    return all.filter((r) => Math.abs(r.pnlSol ?? 0) >= 0.01)
  }, [hideSmall, mode, slice])

  const totals = useMemo(() => {
    const source = slice?.rows ?? []
    const sum = (fn: (r: WalletPosition) => number | null) =>
      source.reduce((s, r) => s + (fn(r) ?? 0), 0)
    return {
      value: sum((r) => r.balanceSol),
      invested: sum((r) => r.investedSol),
      fee: sum((r) => (mode === "open" ? openFee(r) : r.feeSol)),
      claimed: sum((r) => r.feeSol),
      unclaimed: sum((r) => r.unclaimedFeeSol),
      pnl: sum((r) => r.pnlSol),
    }
  }, [mode, slice])

  const totalPages = Math.max(
    1,
    Math.ceil((slice?.totalPositions ?? 0) / PAGE_SIZE),
  )
  const isOpen = mode === "open"
  const columnCount = isOpen ? 10 : 9

  const loadEvents = useCallback(async (row: WalletPosition) => {
    setEvents((prev) => ({
      ...prev,
      [row.position]: { loading: true, error: null, events: [] },
    }))
    try {
      const params = new URLSearchParams({ protocol: row.protocol })
      if (row.tokenX.decimals != null) {
        params.set("decimalsX", String(row.tokenX.decimals))
      }
      if (row.tokenY.decimals != null) {
        params.set("decimalsY", String(row.tokenY.decimals))
      }
      if (row.tokenX.mint) params.set("mintX", row.tokenX.mint)
      if (row.tokenY.mint) params.set("mintY", row.tokenY.mint)
      const res = await fetch(
        `/api/meteora/positions/${encodeURIComponent(row.position)}/events?${params}`,
        { cache: "no-store" },
      )
      const json = (await res.json().catch(() => null)) as {
        events?: PositionEvent[]
        error?: string
      } | null
      if (!res.ok) throw new Error(json?.error || `Events failed (${res.status})`)
      setEvents((prev) => ({
        ...prev,
        [row.position]: { loading: false, error: null, events: json?.events ?? [] },
      }))
    } catch (err) {
      setEvents((prev) => ({
        ...prev,
        [row.position]: {
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load events",
          events: [],
        },
      }))
    }
  }, [])

  function toggle(row: WalletPosition) {
    setExpanded((prev) => {
      const next = { ...prev, [row.position]: !prev[row.position] }
      if (next[row.position] && !events[row.position]) void loadEvents(row)
      return next
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              {title}{" "}
              <span className="text-muted-foreground">
                ({slice?.totalPositions ?? 0})
              </span>
            </h2>
            {isOpen && slice ? (
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Total value{" "}
                  <strong className="text-foreground">
                    {formatSolCompact(totals.value)} SOL
                  </strong>
                </span>
                <span>
                  Total uPnL{" "}
                  <strong
                    className={cn(
                      totals.pnl > 0 && "text-primary",
                      totals.pnl < 0 && "text-danger",
                    )}
                  >
                    {formatSolCompact(totals.pnl, { signed: true })} SOL
                  </strong>
                </span>
                <span>
                  Total claimed fee {formatSolCompact(totals.claimed)} SOL
                </span>
                <span>
                  Total unclaim fee {formatSolCompact(totals.unclaimed)} SOL
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isOpen ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Hide small PnL
                <Switch
                  size="sm"
                  checked={hideSmall}
                  onCheckedChange={setHideSmall}
                />
              </label>
            ) : null}
            <ToggleGroup
              value={[view]}
              onValueChange={(v) => {
                const next = v[0] as "table" | "card" | undefined
                if (next) setView(next)
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="card" aria-label="Card view">
                <LayoutGrid className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view">
                <Table2 className="size-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void load(page, true)}
            >
              <RefreshCw data-icon="inline-start" />
              Refresh
            </Button>
          </div>
        </div>
        {slice?.warning ? (
          <p className="text-xs text-amber-400">{slice.warning}</p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="px-5 py-6 text-sm text-danger">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          {loading ? "Loading…" : `No ${mode} positions for this wallet.`}
        </p>
      ) : view === "card" ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {rows.map((row) => (
            <button
              key={row.position}
              type="button"
              onClick={() => toggle(row)}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 text-left"
            >
              <PositionCell row={row} />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">
                  Age {formatAge(positionAgeSeconds(row))}
                </span>
                <span className="text-right tabular">
                  {formatSolCompact(row.investedSol)} SOL
                </span>
                <SignedSol sol={row.pnlSol} pct={row.pnlPct} />
                <span className="text-right text-muted-foreground">
                  {formatRelative(row.closedAt ?? row.createdAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 pl-4" />
                <TableHead>Position</TableHead>
                <TableHead>Age</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                {isOpen ? (
                  <>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Total Fee</TableHead>
                    <TableHead className="text-right">uPnL</TableHead>
                    <TableHead className="text-right">DPR</TableHead>
                    <TableHead>Range</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-right">Total Fee</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                    <TableHead className="text-right">DPR</TableHead>
                    <TableHead className="text-right">Closed At</TableHead>
                  </>
                )}
                <TableHead className="pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const open = expanded[row.position]
                const state = events[row.position]
                const fee = isOpen ? openFee(row) : row.feeSol
                const dpr = positionDpr(row)
                return (
                  <Fragment key={row.position}>
                    <TableRow
                      onClick={() => toggle(row)}
                      className="cursor-pointer"
                    >
                      <TableCell className="pl-4 text-muted-foreground">
                        <LineChart className="size-3.5" />
                      </TableCell>
                      <TableCell>
                        <PositionCell row={row} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatAge(positionAgeSeconds(row))}
                      </TableCell>
                      <TableCell className="text-right">
                        <SolStack sol={row.investedSol} />
                      </TableCell>
                      {isOpen ? (
                        <>
                          <TableCell className="text-right">
                            <SolStack sol={row.balanceSol} />
                          </TableCell>
                          <TableCell className="text-right">
                            <SignedSol
                              sol={fee}
                              pct={ratioPct(fee, row.investedSol)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <SignedSol sol={row.pnlSol} pct={row.pnlPct} />
                          </TableCell>
                          <TableCell className="text-right">
                            <PctCell value={dpr} />
                          </TableCell>
                          <TableCell>
                            <RangeSpark row={row} />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right">
                            <SignedSol
                              sol={fee}
                              pct={ratioPct(fee, row.investedSol)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <SignedSol sol={row.pnlSol} pct={row.pnlPct} />
                          </TableCell>
                          <TableCell className="text-right">
                            <PctCell value={dpr} />
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {formatRelative(row.closedAt)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="pr-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void copyToClipboard(row.position)
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Copy position"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell
                          colSpan={columnCount}
                          className="bg-muted/30 px-5 py-4"
                        >
                          {!state || state.loading ? (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              Loading history…
                            </p>
                          ) : state.error ? (
                            <p className="text-sm text-danger">{state.error}</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>History</span>
                                <a
                                  href={solscanAccount(row.position)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 hover:text-foreground"
                                >
                                  {truncateAddress(row.position, 4)}
                                  <ExternalLink className="size-3" />
                                </a>
                              </div>
                              <EventsTable events={state.events} row={row} />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
            {slice
              ? ` · ${slice.loadedPositions} loaded · ${slice.poolsScanned} DLMM pools`
              : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft data-icon="inline-start" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
