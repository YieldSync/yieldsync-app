"use client"

import { useState } from "react"
import {
  Activity,
  ArrowUpRight,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
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
  ChartCard,
  Money,
  SectionHeader,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/primitives"
import {
  activitySeries,
  performanceSeries,
  recentActivity,
  strategyPerformance,
} from "@/lib/data"
import { sectionHref } from "@/lib/navigation"

const perfConfig = {
  total: { label: "Total PnL", color: "var(--chart-1)" },
  realized: { label: "Realized PnL", color: "var(--chart-2)" },
  unrealized: { label: "Unrealized PnL", color: "var(--chart-3)" },
} satisfies ChartConfig

const activityConfig = {
  signals: { label: "Signals", color: "var(--chart-3)" },
  executions: { label: "Executions", color: "var(--chart-1)" },
} satisfies ChartConfig

const strategyConfig = {
  pnl: { label: "PnL", color: "var(--chart-1)" },
} satisfies ChartConfig

export function OverviewSection() {
  const [range, setRange] = useState("30d")

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Dashboard"
        description="Overview of wallet performance, sync activity and execution metrics across your workspace."
      >
        <ToggleGroup
          value={[range]}
          onValueChange={(value) => value[0] && setRange(value[0] as string)}
          className="hidden sm:flex"
        >
          <ToggleGroupItem value="7d">7D</ToggleGroupItem>
          <ToggleGroupItem value="30d">30D</ToggleGroupItem>
          <ToggleGroupItem value="90d">90D</ToggleGroupItem>
        </ToggleGroup>
      </SectionHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Tracking Wallets"
          value="14"
          sub="of 20 seats"
          delta={12.45}
          icon={RefreshCw}
          spark={[4, 6, 5, 8, 7, 10, 12, 14]}
        />
        <StatCard
          label="Active Strategies"
          value="6"
          sub="of 10 slots"
          delta={8.1}
          icon={SlidersHorizontal}
          spark={[2, 2, 3, 3, 4, 5, 5, 6]}
        />
        <StatCard
          label="Total Execution Volume"
          value="$128,430.29"
          sub="last 30 days"
          delta={15.2}
          icon={Layers}
          spark={[20, 34, 28, 44, 61, 58, 82, 96]}
        />
        <StatCard
          label="7D Performance"
          value="+$18,392.75"
          sub="net realized + open"
          delta={6.34}
          icon={TrendingUp}
          spark={[8, 11, 9, 14, 13, 17, 16, 18]}
        />
      </div>

      <ChartCard
        title="Portfolio Performance"
        description="Aggregated PnL across every tracked wallet and active strategy."
        action={
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold tabular">+$18,392.75</span>
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success tabular">
              <ArrowUpRight className="size-3.5" />
              15.20%
            </span>
          </div>
        }
      >
        <ChartContainer config={perfConfig} className="h-[300px] w-full">
          <AreaChart data={performanceSeries} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval={2}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={52}
              tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
              className="text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="total"
              type="monotone"
              stroke="var(--color-total)"
              strokeWidth={2}
              fill="url(#fillTotal)"
            />
            <Area
              dataKey="realized"
              type="monotone"
              stroke="var(--color-realized)"
              strokeWidth={1.75}
              fill="transparent"
            />
            <Area
              dataKey="unrealized"
              type="monotone"
              stroke="var(--color-unrealized)"
              strokeWidth={1.75}
              fill="transparent"
            />
          </AreaChart>
        </ChartContainer>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: "Total PnL", value: "+$18,392.75" },
            { label: "Realized PnL", value: "+$12,843.21" },
            { label: "Unrealized PnL", value: "+$5,549.54" },
            { label: "Win Rate", value: "68.4%" },
            { label: "Total Trades", value: "432" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 rounded-lg bg-muted/40 px-3 py-2.5"
            >
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-sm font-semibold tabular">{item.value}</span>
            </div>
          ))}
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Wallet Activity Timeline"
          description="Detected signals versus executed trades over the last 24 hours."
        >
          <ChartContainer config={activityConfig} className="h-[240px] w-full">
            <LineChart data={activitySeries} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(value: string) => `${value}:00`}
                className="text-xs"
              />
              <YAxis tickLine={false} axisLine={false} width={32} className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="signals"
                type="monotone"
                stroke="var(--color-signals)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="executions"
                type="monotone"
                stroke="var(--color-executions)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Strategy Performance"
          description="30 day net PnL contribution per synchronization rule."
        >
          <ChartContainer config={strategyConfig} className="h-[240px] w-full">
            <BarChart data={strategyPerformance} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(value: number) => `$${(value / 1000).toFixed(1)}K`}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="pnl" fill="var(--color-pnl)" radius={[6, 6, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <Card className="py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">Recent Activity</h2>
            <p className="text-xs text-muted-foreground">
              Latest executions mirrored from your tracked wallets.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={sectionHref("activities")} />}
          >
            <Activity data-icon="inline-start" />
            View all activity
          </Button>
        </div>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Wallet</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="pr-5 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((row, index) => (
                  <TableRow key={`${row.token}-${index}`}>
                    <TableCell className="pl-5">
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium">{row.wallet}</span>
                        <span className="text-xs text-muted-foreground tabular">
                          {row.address}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.action}</TableCell>
                    <TableCell>
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium text-primary">{row.token}</span>
                        <span className="text-xs text-muted-foreground">{row.pair}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.amount * 1000} />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular">{row.time}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
