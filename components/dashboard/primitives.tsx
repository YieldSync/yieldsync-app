"use client"

import type React from "react"
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionHeader({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
  spark,
}: {
  label: string
  value: string
  sub?: string
  delta?: number
  icon: LucideIcon
  spark?: number[]
}) {
  const positive = (delta ?? 0) >= 0
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Icon className="size-4" />
          </div>
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
            {label}
          </p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-2xl font-semibold tracking-tight whitespace-nowrap tabular">
              {value}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {typeof delta === "number" ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium tabular",
                    positive ? "text-success" : "text-destructive"
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {Math.abs(delta).toFixed(2)}%
                </span>
              ) : null}
              {sub ? (
                <span className="text-xs whitespace-nowrap text-muted-foreground">
                  {sub}
                </span>
              ) : null}
            </div>
          </div>
          {spark ? <Sparkline points={spark} positive={positive} /> : null}
        </div>
      </div>
    </Card>
  )
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const width = 80
  const height = 40
  const step = width / (points.length - 1)
  const path = points
    .map((point, index) => {
      const x = index * step
      const y = height - ((point - min) / range) * (height - 4) - 2
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  const gradientId = `spark-${positive ? "up" : "down"}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="hidden h-9 w-16 shrink-0 self-end xl:block"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={positive ? "var(--chart-1)" : "var(--destructive)"}
            stopOpacity="0.45"
          />
          <stop
            offset="100%"
            stopColor={positive ? "var(--chart-1)" : "var(--destructive)"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path
        d={`${path} L${width},${height} L0,${height} Z`}
        fill={`url(#${gradientId})`}
      />
      <path
        d={path}
        fill="none"
        stroke={positive ? "var(--chart-1)" : "var(--destructive)"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "secondary" | "destructive" | "outline"; className?: string }> =
    {
      Executed: { variant: "secondary", className: "bg-success/15 text-success" },
      Paid: { variant: "secondary", className: "bg-success/15 text-success" },
      Synced: { variant: "secondary", className: "bg-success/15 text-success" },
      Active: { variant: "secondary", className: "bg-success/15 text-success" },
      Syncing: { variant: "secondary", className: "bg-chart-3/15 text-chart-3" },
      Pending: { variant: "secondary", className: "bg-chart-3/15 text-chart-3" },
      Skipped: { variant: "secondary", className: "bg-chart-4/15 text-chart-4" },
      Paused: { variant: "secondary", className: "bg-chart-4/15 text-chart-4" },
      Failed: { variant: "destructive" },
      Error: { variant: "destructive" },
      Draft: { variant: "outline" },
    }
  const config = map[status] ?? { variant: "outline" as const }
  return (
    <Badge variant={config.variant} className={cn("font-medium", config.className)}>
      {status}
    </Badge>
  )
}

export function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value >= 0
  return (
    <span
      className={cn(
        "font-medium tabular",
        value === 0
          ? "text-muted-foreground"
          : positive
            ? "text-success"
            : "text-destructive"
      )}
    >
      {positive && value !== 0 ? "+" : ""}
      {value.toFixed(2)}
      {suffix}
    </span>
  )
}

export function Money({ value }: { value: number }) {
  const positive = value >= 0
  return (
    <span
      className={cn(
        "font-medium tabular",
        value === 0
          ? "text-muted-foreground"
          : positive
            ? "text-success"
            : "text-destructive"
      )}
    >
      {positive && value !== 0 ? "+" : value < 0 ? "-" : ""}$
      {Math.abs(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  )
}
