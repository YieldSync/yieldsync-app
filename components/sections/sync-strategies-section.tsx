"use client"

import { useState } from "react"
import {
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  SectionHeader,
  StatusBadge,
} from "@/components/dashboard/primitives"
import { StrategyBuilder } from "@/components/sections/strategy-builder"
import { useStrategies } from "@/hooks/use-strategies"
import { useTradingWallets } from "@/hooks/use-trading-wallets"
import { useWalletsData } from "@/hooks/use-wallets-data"
import { shortAddress } from "@/lib/data"

export function SyncStrategiesSection() {
  const [builderOpen, setBuilderOpen] = useState(false)
  const { strategies, loading, error, create, setEnabled, remove } = useStrategies()
  const { wallets: syncWallets } = useWalletsData()
  const { wallets: tradingWallets } = useTradingWallets()

  const activeCount = strategies.filter((s) => s.enabled).length

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Strategies"
        description="Create and manage rules that copy a leader sync wallet onto your trading wallet."
      >
        <Button size="lg" onClick={() => setBuilderOpen((open) => !open)}>
          {builderOpen ? (
            <X data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          {builderOpen ? "Close builder" : "Create strategy"}
        </Button>
      </SectionHeader>

      {error ? (
        <p role="alert" className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {builderOpen ? (
        <StrategyBuilder
          syncWallets={syncWallets}
          tradingWallets={tradingWallets}
          onCancel={() => setBuilderOpen(false)}
          onCreate={async (input) => {
            await create(input)
            setBuilderOpen(false)
          }}
        />
      ) : null}

      <Card className="py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">All strategies</h2>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Loading…"
                : `${activeCount} active · ${strategies.length} total`}
            </p>
          </div>
        </div>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Strategy</TableHead>
                  <TableHead>Leader</TableHead>
                  <TableHead>Trading wallet</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Min / Max</TableHead>
                  <TableHead>Slippage</TableHead>
                  <TableHead>Auto sell</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-8 text-sm text-muted-foreground">
                      Loading strategies…
                    </TableCell>
                  </TableRow>
                ) : strategies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-8 text-sm text-muted-foreground">
                      No strategies yet. Create one to start copy trading.
                    </TableCell>
                  </TableRow>
                ) : (
                  strategies.map((strategy) => (
                    <TableRow key={strategy.id}>
                      <TableCell className="pl-5 font-medium">{strategy.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span>{strategy.sourceName || "Leader"}</span>
                          <span className="text-xs text-muted-foreground tabular">
                            {shortAddress(strategy.sourceWallet)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span>{strategy.executionLabel || "Execution"}</span>
                          <span className="text-xs text-muted-foreground tabular">
                            {shortAddress(strategy.executionWallet)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular">
                        {strategy.sizingMode === "fixed"
                          ? `${strategy.fixedSizeSol ?? "—"} SOL`
                          : `${strategy.copyPct}%`}
                      </TableCell>
                      <TableCell className="tabular text-muted-foreground">
                        {strategy.minSizeSol} / {strategy.maxSizeSol} SOL
                      </TableCell>
                      <TableCell className="tabular">{strategy.slippagePct}%</TableCell>
                      <TableCell className="text-muted-foreground">
                        {strategy.autoSell
                          ? `On · ${strategy.autoSellRetries} retries`
                          : "Off"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={strategy.enabled ? "Active" : "Paused"} />
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Strategy actions"
                              >
                                <MoreHorizontal />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() =>
                                  void setEnabled(strategy.id, !strategy.enabled)
                                }
                              >
                                {strategy.enabled ? <Pause /> : <Play />}
                                {strategy.enabled ? "Pause" : "Enable"}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => void remove(strategy.id)}
                            >
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
