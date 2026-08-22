"use client"

import { useMemo, useState } from "react"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ProtocolFilter } from "@/lib/meteora/wallet-positions"
import type { WalletPosition, WalletStats } from "@/lib/meteora/types"
import { formatSolCompact } from "@/lib/meteora/format"
import { cn } from "@/lib/utils"

const CHART_CONFIG = {
  pnl: { label: "Profit", color: "var(--primary)" },
  cumulative: { label: "Cumulative", color: "#e8c36a" },
} satisfies ChartConfig

type RangeKey = "7d" | "1m" | "3m" | "1y" | "ytd" | "all"
type Bucket = "day" | "week" | "month"

const RANGE_SECONDS: Record<RangeKey, number | null> = {
  "7d": 7 * 86_400,
  "1m": 30 * 86_400,
  "3m": 90 * 86_400,
  "1y": 365 * 86_400,
  ytd: null,
  all: null,
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "up" | "down"
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-lg font-semibold tabular leading-tight",
          tone === "up" && "text-primary",
          tone === "down" && "text-danger",
        )}
      >
        {value}
      </span>
    </div>
  )
}

function toneOf(n: number | null): "up" | "down" | undefined {
  if (n == null || n === 0) return undefined
  return n > 0 ? "up" : "down"
}

function sol(n: number | null, signed = false) {
  if (n == null) return "—"
  return `${formatSolCompact(n, { signed })} SOL`
}

export function WalletOverview({
  stats,
  closed,
  protocol,
  onProtocol,
}: {
  stats: WalletStats | null
  closed: WalletPosition[]
  protocol: ProtocolFilter
  onProtocol: (next: ProtocolFilter) => void
}) {
  const [bucket, setBucket] = useState<Bucket>("day")
  const [range, setRange] = useState<RangeKey>("all")
  const sampled = stats?.sampled

  const chart = useMemo(() => {
    const now = Math.floor(Date.now() / 1000)
    const startOfYear = Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000
    const window = RANGE_SECONDS[range]
    const from =
      range === "ytd" ? startOfYear : window == null ? 0 : now - window
    const rows = closed
      .filter((p) => (p.closedAt ?? p.createdAt ?? 0) >= from)
      .map((p) => ({
        t: p.closedAt ?? p.createdAt ?? 0,
        pnl: p.pnlSol ?? 0,
      }))
      .filter((r) => r.t > 0)
      .sort((a, b) => a.t - b.t)

    const size = bucket === "day" ? 86_400 : bucket === "week" ? 7 * 86_400 : 30 * 86_400
    const bins = new Map<number, number>()
    for (const row of rows) {
      const key = Math.floor(row.t / size) * size
      bins.set(key, (bins.get(key) ?? 0) + row.pnl)
    }
    let cumulative = 0
    return [...bins.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, pnl]) => {
        cumulative += pnl
        return {
          t,
          label: new Date(t * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          }),
          pnl,
          cumulative,
        }
      })
  }, [bucket, closed, range])

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Total Net Worth" value={sol(stats?.netWorthSol ?? null)} />
        <Stat
          label="Total Closed"
          value={String(stats?.closedPositions ?? 0)}
        />
        <Stat
          label="Win Rate"
          value={sampled?.winRate == null ? "—" : `${sampled.winRate.toFixed(2)}%`}
          tone={toneOf(sampled?.winRate ?? null)}
        />
        <Stat label="Avg Invested" value={sol(sampled?.avgInvestedSol ?? null)} />
        <Stat label="Fee Earned" value={sol(sampled?.feeEarnedSol ?? null)} />
        <Stat
          label="Total Profit"
          value={sol(sampled?.pnlSol ?? stats?.realisedPnlSol ?? null, true)}
          tone={toneOf(sampled?.pnlSol ?? stats?.realisedPnlSol ?? null)}
        />
        <Stat
          label="Avg Monthly Profit"
          value={sol(sampled?.avgMonthlyPnlSol ?? null, true)}
          tone={toneOf(sampled?.avgMonthlyPnlSol ?? null)}
        />
        <Stat
          label="Expected Value"
          value={sol(sampled?.expectedValueSol ?? null, true)}
          tone={toneOf(sampled?.expectedValueSol ?? null)}
        />
      </div>

      <div className="flex min-h-[260px] flex-col rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Profit history
          </h2>
          <ToggleGroup
            value={[protocol]}
            onValueChange={(v) => {
              const next = v[0] as ProtocolFilter | undefined
              if (next) onProtocol(next)
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="dlmm">DLMM</ToggleGroupItem>
            <ToggleGroupItem value="damm2">DAMM V2</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <ToggleGroup
            value={[bucket]}
            onValueChange={(v) => {
              const next = v[0] as Bucket | undefined
              if (next) setBucket(next)
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="day">Day</ToggleGroupItem>
            <ToggleGroupItem value="week">Week</ToggleGroupItem>
            <ToggleGroupItem value="month">Month</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            value={[range]}
            onValueChange={(v) => {
              const next = v[0] as RangeKey | undefined
              if (next) setRange(next)
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="7d">7D</ToggleGroupItem>
            <ToggleGroupItem value="1m">1M</ToggleGroupItem>
            <ToggleGroupItem value="3m">3M</ToggleGroupItem>
            <ToggleGroupItem value="1y">1Y</ToggleGroupItem>
            <ToggleGroupItem value="ytd">YTD</ToggleGroupItem>
            <ToggleGroupItem value="all">ALL</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="mt-3 min-h-0 flex-1">
          {chart.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Profit history appears once closed positions are loaded.
            </p>
          ) : (
            <ChartContainer config={CHART_CONFIG} className="aspect-auto h-[200px] w-full">
              <ComposedChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v) => formatSolCompact(Number(v))}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span>
                          {name === "cumulative" ? "Cumulative" : "Profit"}{" "}
                          {formatSolCompact(Number(value), { signed: true })} SOL
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="pnl" fill="var(--color-pnl)" radius={[3, 3, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--color-cumulative)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  )
}
