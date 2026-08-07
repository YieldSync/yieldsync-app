"use client"

import { useEffect, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Pause,
  Play,
  Radio,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Money, SectionHeader } from "@/components/dashboard/primitives"
import { liveTransactions, syncWallets, tokenMovements } from "@/lib/data"
import { cn } from "@/lib/utils"

export function ActivitiesSection() {
  const [live, setLive] = useState(true)
  const [feed, setFeed] = useState(liveTransactions)

  useEffect(() => {
    if (!live) return
    const interval = setInterval(() => {
      setFeed((current) => {
        const next = [...current]
        const moved = next.pop()
        if (!moved) return current
        const now = new Date()
        return [
          {
            ...moved,
            id: Date.now(),
            time: now.toLocaleTimeString("en-GB", { hour12: false }),
            block: String(Number(moved.block) + 137),
          },
          ...next,
        ]
      })
    }, 3200)
    return () => clearInterval(interval)
  }, [live])

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Activities"
        description="Live transactions, token movements and alerts across every tracked wallet."
      >
        <Button
          variant={live ? "outline" : "default"}
          size="lg"
          onClick={() => setLive((value) => !value)}
        >
          {live ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
          {live ? "Pause stream" : "Resume stream"}
        </Button>
      </SectionHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="relative flex size-2">
                <span
                  className={cn(
                    "absolute inline-flex size-2 rounded-full bg-success",
                    live && "animate-ping"
                  )}
                />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Live transaction feed
            </CardTitle>
            <CardDescription>
              Streaming confirmed transactions from all tracked wallets.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <ScrollArea className="h-[420px]">
              <div className="flex flex-col">
                {feed.map((tx, index) => (
                  <div
                    key={tx.id}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3",
                      index !== feed.length - 1 && "border-b border-border/60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        tx.side === "Buy"
                          ? "bg-success/12 text-success"
                          : "bg-destructive/12 text-destructive"
                      )}
                    >
                      {tx.side === "Buy" ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowDownRight className="size-4" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-sm font-medium">
                        {tx.side} {tx.token}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {tx.wallet} · block {tx.block}
                      </span>
                    </div>
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-sm font-medium tabular">{tx.value}</span>
                      <span className="text-xs text-muted-foreground tabular">
                        {tx.amount} {tx.token}
                      </span>
                    </div>
                    <span className="hidden w-20 text-right text-xs text-muted-foreground tabular sm:block">
                      {tx.time}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Token movements</CardTitle>
              <CardDescription>Net flow across tracked wallets, 24h.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {tokenMovements.map((token) => (
                <div key={token.token} className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="text-sm font-medium">{token.token}</span>
                    <span className="text-xs text-muted-foreground">
                      {token.volume} · {token.wallets} wallets
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "tabular",
                      token.net >= 0
                        ? "bg-success/15 text-success"
                        : "bg-destructive/15 text-destructive"
                    )}
                  >
                    {token.net >= 0 ? "+" : ""}
                    {token.net.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-primary" />
                Buy / Sell alerts
              </CardTitle>
              <CardDescription>Triggered thresholds in the last hour.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[
                { text: "Solana OG bought DOOM > $3K", side: "Buy" as const, time: "2m" },
                { text: "Momentum Desk sold WIF > $2K", side: "Sell" as const, time: "9m" },
                { text: "Sniper 04 bought NEEGY", side: "Buy" as const, time: "14m" },
                { text: "Degen Rotator sold POPCAT", side: "Sell" as const, time: "31m" },
              ].map((alert) => (
                <div key={alert.text} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      alert.side === "Buy" ? "bg-success" : "bg-destructive"
                    )}
                  />
                  <p className="flex-1 text-sm leading-relaxed text-pretty">{alert.text}</p>
                  <span className="text-xs text-muted-foreground tabular">{alert.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="size-4 text-primary" />
            Wallet activity
          </CardTitle>
          <CardDescription>
            Health, throughput and last seen signal for every tracked wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {syncWallets.map((wallet) => (
              <div
                key={wallet.address}
                className="flex flex-col gap-3 rounded-xl bg-muted/30 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">{wallet.label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {wallet.category} · {wallet.lastActivity}
                    </span>
                  </div>
                  <Money value={wallet.pnl7d} />
                </div>
                <Separator />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Health</span>
                    <span className="tabular">{wallet.health}%</span>
                  </div>
                  <Progress
                    value={wallet.health}
                    className={cn("h-1.5", wallet.health < 60 && "[&>div]:bg-destructive")}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Copied trades</span>
                  <span className="tabular">{wallet.copiedTrades}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
