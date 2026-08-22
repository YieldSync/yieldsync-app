"use client"

import { useState } from "react"
import {
  MoreHorizontal,
  Pause,
  Pencil,
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
import { useEnableCopyTradingWallet } from "@/hooks/use-enable-copy-trading-wallet"
import { useStrategies } from "@/hooks/use-strategies"
import { useTradingWallets } from "@/hooks/use-trading-wallets"
import { useWalletsData } from "@/hooks/use-wallets-data"
import { WalletLink } from "@/components/wallet/wallet-link"
import type { CopyStrategy, CopyStrategyInput } from "@/lib/copy-strategies/api"

function statusLabel(status: CopyStrategy["status"]) {
  if (status === "draft") return "Draft"
  if (status === "paused") return "Paused"
  return "Active"
}

export function SyncStrategiesSection() {
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editing, setEditing] = useState<CopyStrategy | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const { strategies, loading, error, create, update, setEnabled, remove } =
    useStrategies()
  const enableCopyTradingWallet = useEnableCopyTradingWallet()
  const { wallets: syncWallets } = useWalletsData()
  const { wallets: tradingWallets } = useTradingWallets()

  const activeCount = strategies.filter((s) => s.status === "active").length

  function openCreate() {
    setEditing(null)
    setBuilderOpen(true)
  }

  function openEdit(strategy: CopyStrategy) {
    setEditing(strategy)
    setBuilderOpen(true)
  }

  function closeBuilder() {
    setBuilderOpen(false)
    setEditing(null)
  }

  async function saveStrategy(input: CopyStrategyInput) {
    setActionError(null)
    const wantsActive = input.status === "active" || input.enabled === true

    if (editing) {
      if (wantsActive) {
        const granted = await enableCopyTradingWallet(input.executionWallet)
        await update(editing.id, {
          ...input,
          status: "active",
          privyWalletId: granted.privy_wallet_id,
        })
      } else if (input.status === "draft") {
        await update(editing.id, {
          ...input,
          status: "draft",
          privyWalletId: null,
        })
      } else {
        await update(editing.id, {
          ...input,
          status: "paused",
        })
      }
      return
    }

    if (wantsActive) {
      const granted = await enableCopyTradingWallet(input.executionWallet)
      await create({
        ...input,
        status: "active",
        privyWalletId: granted.privy_wallet_id,
      })
      return
    }

    await create({
      ...input,
      status: "draft",
      privyWalletId: null,
    })
  }

  async function toggleEnabled(
    strategyId: string,
    nextEnabled: boolean,
    executionWallet: string,
  ) {
    setActionError(null)
    try {
      if (nextEnabled) {
        const granted = await enableCopyTradingWallet(executionWallet)
        await setEnabled(strategyId, true, {
          privyWalletId: granted.privy_wallet_id,
        })
      } else {
        await setEnabled(strategyId, false)
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update strategy",
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Strategies"
        description="Create and manage rules that copy a leader sync wallet onto your trading wallet."
      >
        <Button
          size="lg"
          onClick={() => (builderOpen ? closeBuilder() : openCreate())}
        >
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
      {actionError ? (
        <p role="alert" className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      {builderOpen ? (
        <StrategyBuilder
          key={editing?.id ?? "new"}
          syncWallets={syncWallets}
          tradingWallets={tradingWallets}
          initial={editing}
          onCancel={closeBuilder}
          onSave={async (input) => {
            try {
              await saveStrategy(input)
              closeBuilder()
            } catch (err) {
              setActionError(
                err instanceof Error ? err.message : "Failed to save strategy",
              )
              throw err
            }
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
                            <WalletLink address={strategy.sourceWallet} />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span>{strategy.executionLabel || "Execution"}</span>
                          <span className="text-xs text-muted-foreground tabular">
                            <WalletLink address={strategy.executionWallet} />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular">
                        {strategy.sizingMode === "fixed"
                          ? `${strategy.fixedSizeSol ?? "—"} SOL`
                          : `${strategy.copyPct}%`}
                        <div className="text-xs text-muted-foreground">
                          max{" "}
                          {strategy.maxSizeSol == null
                            ? "∞"
                            : `${strategy.maxSizeSol} SOL`}{" "}
                          · {strategy.maxPositions} open
                        </div>
                      </TableCell>
                      <TableCell className="tabular text-muted-foreground">
                        {strategy.minSizeSol} /{" "}
                        {strategy.maxSizeSol == null
                          ? "∞"
                          : strategy.maxSizeSol}{" "}
                        SOL
                      </TableCell>
                      <TableCell className="tabular">{strategy.slippagePct}%</TableCell>
                      <TableCell className="text-muted-foreground">
                        {strategy.autoSell
                          ? `On · ${strategy.autoSellRetries} retries`
                          : "Off"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={statusLabel(strategy.status)} />
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
                                onClick={() => openEdit(strategy)}
                              >
                                <Pencil />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void toggleEnabled(
                                    strategy.id,
                                    strategy.status !== "active",
                                    strategy.executionWallet,
                                  )
                                }
                              >
                                {strategy.status === "active" ? (
                                  <Pause />
                                ) : (
                                  <Play />
                                )}
                                {strategy.status === "active"
                                  ? "Pause"
                                  : "Enable"}
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
