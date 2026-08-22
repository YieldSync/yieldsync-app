"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { StatusBadge } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { WalletLink } from "@/components/wallet/wallet-link"
import { PortfolioTable } from "@/components/wallet/portfolio-tables"
import { WalletOverview } from "@/components/wallet/wallet-overview"
import type { ProtocolFilter, WalletPositionsSlice } from "@/lib/meteora/wallet-positions"
import { sampleFromPositions } from "@/lib/meteora/wallet-stats"
import type { WalletPosition, WalletStats } from "@/lib/meteora/types"
import {
  listCopyTradesForWallet,
  type CopyTradeExecution,
} from "@/lib/copy-trades/api"
import {
  listTradingWallets,
  type TradingWalletRow,
} from "@/lib/trading-wallets/api"
import { fetchWallets } from "@/lib/wallets/api"
import type { Wallet } from "@/lib/wallets/types"
import {
  copyToClipboard,
  isValidSolanaAddress,
  truncateAddress,
} from "@/lib/utils"

type PositionRow = {
  id: string
  strategy_id?: string
  protocol?: string
  pool?: string
  source_position?: string
  user_position?: string
  source_owner?: string
  execution_wallet?: string
  status?: string
  opened_at?: string
  closed_at?: string | null
  bin_lower?: number | null
  bin_upper?: number | null
  liquidity_adds?: number
}

function solscanAccount(address: string) {
  return `https://solscan.io/account/${address}`
}

function solscanTx(sig: string) {
  return `https://solscan.io/tx/${sig}`
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-GB", {
      hour12: false,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return iso
  }
}

function statusTone(status: string): string {
  const s = status.toLowerCase()
  if (s === "confirmed" || s === "open") return "Active"
  if (s === "sent" || s === "signed" || s === "pending" || s === "closing") {
    return "Pending"
  }
  if (s === "failed" || s === "error") return "Failed"
  if (s === "skipped" || s === "closed") return "Skipped"
  if (s === "paused") return "Paused"
  return status
}

function PositionsTable({
  rows,
  empty,
}: {
  rows: PositionRow[]
  empty: string
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Status</TableHead>
            <TableHead>Protocol</TableHead>
            <TableHead>Pool</TableHead>
            <TableHead>User position</TableHead>
            <TableHead>Leader</TableHead>
            <TableHead>Execution</TableHead>
            <TableHead className="pr-5">Opened</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-5 capitalize">
                <StatusBadge status={statusTone(row.status || "unknown")} />
                <span className="ml-2 text-xs text-muted-foreground">
                  {row.status}
                </span>
              </TableCell>
              <TableCell className="uppercase text-muted-foreground">
                {row.protocol || "—"}
              </TableCell>
              <TableCell className="tabular">
                {row.pool ? (
                  <WalletLink address={row.pool} chars={4} />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="tabular">
                {row.user_position ? (
                  <a
                    href={solscanAccount(row.user_position)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {truncateAddress(row.user_position, 4)}
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
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
              <TableCell className="pr-5 text-xs text-muted-foreground">
                {formatWhen(row.opened_at)}
                {row.closed_at ? (
                  <div>Closed {formatWhen(row.closed_at)}</div>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function WalletDetail({ address }: { address: string }) {
  const wallet = address.trim()
  const valid = isValidSolanaAddress(wallet)
  const { session, loading: authLoading, supabase } = useSupabaseAuth()

  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState<PositionRow[]>([])
  const [closed, setClosed] = useState<PositionRow[]>([])
  const [protocol, setProtocol] = useState<ProtocolFilter>("all")
  const [stats, setStats] = useState<WalletStats | null>(null)
  const [closedMeteora, setClosedMeteora] = useState<WalletPosition[]>([])
  const [trades, setTrades] = useState<CopyTradeExecution[]>([])
  const [tradingMeta, setTradingMeta] = useState<TradingWalletRow | null>(null)
  const [trackingMeta, setTrackingMeta] = useState<Wallet | null>(null)
  const [positionsError, setPositionsError] = useState<string | null>(null)
  const [tradesError, setTradesError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!valid) return
    setLoading(true)
    setPositionsError(null)
    setTradesError(null)

    const statsP = fetch(
      `/api/meteora/wallet-stats?wallet=${encodeURIComponent(wallet)}`,
      { cache: "no-store" },
    )
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          stats?: WalletStats
          error?: string
        } | null
        if (!res.ok) throw new Error(json?.error || `Stats failed (${res.status})`)
        if (json?.stats) setStats(json.stats)
      })
      .catch((err: unknown) => {
        setPositionsError(
          err instanceof Error ? err.message : "Failed to load wallet stats",
        )
      })

    const positionsP = fetch(`/api/wallets/${encodeURIComponent(wallet)}/positions`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          open?: PositionRow[]
          closed?: PositionRow[]
          error?: string
        } | null
        if (!res.ok) {
          throw new Error(json?.error || `Positions failed (${res.status})`)
        }
        setOpen(json?.open ?? [])
        setClosed(json?.closed ?? [])
      })
      .catch((err: unknown) => {
        setOpen([])
        setClosed([])
        setPositionsError(
          err instanceof Error ? err.message : "Failed to load positions",
        )
      })

    const metaP =
      supabase && session
        ? Promise.all([
            listTradingWallets(supabase).catch(() => [] as TradingWalletRow[]),
            fetchWallets(supabase).catch(() => [] as Wallet[]),
            listCopyTradesForWallet(supabase, wallet).catch((err: unknown) => {
              setTradesError(
                err instanceof Error ? err.message : "Failed to load copy trades",
              )
              return [] as CopyTradeExecution[]
            }),
          ]).then(([trading, tracking, copyTrades]) => {
            setTradingMeta(
              trading.find(
                (w) => w.address.toLowerCase() === wallet.toLowerCase(),
              ) ?? null,
            )
            setTrackingMeta(
              tracking.find(
                (w) => w.address.toLowerCase() === wallet.toLowerCase(),
              ) ?? null,
            )
            setTrades(copyTrades)
          })
        : Promise.resolve().then(() => {
            setTrades([])
            setTradingMeta(null)
            setTrackingMeta(null)
          })

    await Promise.all([statsP, positionsP, metaP])
    setLoading(false)
  }, [supabase, session, valid, wallet])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const title = useMemo(() => {
    if (tradingMeta?.label?.trim()) return tradingMeta.label.trim()
    if (trackingMeta?.name?.trim()) return trackingMeta.name.trim()
    return "Wallet"
  }, [tradingMeta, trackingMeta])

  const displayStats = useMemo(() => {
    if (!stats) return null
    return { ...stats, sampled: sampleFromPositions(closedMeteora) }
  }, [closedMeteora, stats])

  const onClosedSlice = useCallback((slice: WalletPositionsSlice) => {
    setClosedMeteora((prev) => {
      const byId = new Map(prev.map((p) => [p.position, p]))
      for (const row of slice.rows) byId.set(row.position, row)
      return [...byId.values()]
    })
  }, [])

  function changeProtocol(next: ProtocolFilter) {
    setProtocol(next)
    setClosedMeteora([])
  }

  const roles = useMemo(() => {
    const tags: string[] = []
    if (tradingMeta) tags.push("Trading wallet")
    if (trackingMeta) tags.push("Tracking wallet")
    if (tags.length === 0) tags.push("Solana wallet")
    return tags
  }, [tradingMeta, trackingMeta])

  async function onCopy() {
    await copyToClipboard(wallet)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (!valid) {
    return (
      <div className="flex w-full flex-col gap-4">
        <p className="text-sm text-danger">Invalid Solana wallet address.</p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/trading-wallets" />}
        >
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href="/trading-wallets"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => void onCopy()}
              className="inline-flex items-center gap-1.5 font-mono tabular hover:text-foreground"
            >
              {wallet}
              {copied ? (
                <Check className="size-3.5 text-primary" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
            <a
              href={solscanAccount(wallet)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Solscan
              <ExternalLink className="size-3.5" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground">{roles.join(" · ")}</p>
        </div>
        <Button
          variant="outline"
          size="lg"
          disabled={loading || authLoading}
          onClick={() => void refresh()}
        >
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </div>

      {!session && !authLoading ? (
        <p className="text-sm text-muted-foreground">
          Sign in to see your copy trades for this wallet.{" "}
          <Link
            href={`/login?next=/wallet/${wallet}`}
            className="text-primary hover:underline"
          >
            Login
          </Link>
        </p>
      ) : null}

      {positionsError ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {positionsError}
        </p>
      ) : null}
      {tradesError ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {tradesError}
        </p>
      ) : null}

      <WalletOverview
        stats={displayStats}
        closed={closedMeteora}
        protocol={protocol}
        onProtocol={changeProtocol}
      />

      <PortfolioTable
        wallet={wallet}
        mode="open"
        protocol={protocol}
        title="Open positions"
      />

      <PortfolioTable
        wallet={wallet}
        mode="closed"
        protocol={protocol}
        title="Historical positions"
        onSlice={onClosedSlice}
      />

      <Card className="py-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Copy trade mappings</CardTitle>
          <CardDescription>
            Positions the YieldSync backend tracks for this wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <PositionsTable
            rows={[...open, ...closed]}
            empty={
              loading ? "Loading…" : "No mapped positions for this wallet yet."
            }
          />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Copy trades</CardTitle>
          <CardDescription>
            Execution log from strategies where this wallet is leader or trading
            wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {!session ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              Sign in to view copy trade history.
            </p>
          ) : trades.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              {loading ? "Loading…" : "No copy trades for this wallet yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">When</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pool</TableHead>
                    <TableHead>Leader tx</TableHead>
                    <TableHead className="pr-5">Your tx</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="pl-5 text-xs text-muted-foreground">
                        {formatWhen(t.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium">
                            {t.strategyName || "Strategy"}
                          </span>
                          <span className="text-xs capitalize text-muted-foreground">
                            {t.role}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {t.action || "—"}
                        {t.protocol ? (
                          <span className="ml-1 uppercase text-xs">
                            · {t.protocol}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={statusTone(t.status)} />
                        <span className="ml-2 text-xs capitalize text-muted-foreground">
                          {t.status}
                        </span>
                        {t.errorMessage ? (
                          <div
                            className="mt-1 max-w-xs truncate text-xs text-danger"
                            title={t.errorMessage}
                          >
                            {t.errorMessage}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular">
                        {t.poolAddress ? (
                          <WalletLink address={t.poolAddress} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="tabular">
                        {t.sourceSignature ? (
                          <a
                            href={solscanTx(t.sourceSignature)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            {truncateAddress(t.sourceSignature, 4)}
                            <ExternalLink className="size-3 text-muted-foreground" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="pr-5 tabular">
                        {t.userSignature ? (
                          <a
                            href={solscanTx(t.userSignature)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            {truncateAddress(t.userSignature, 4)}
                            <ExternalLink className="size-3 text-muted-foreground" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
