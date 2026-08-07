"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Copy,
  KeyRound,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Trash2,
  Wallet,
  Coins,
  Layers,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Money, SectionHeader, StatCard, StatusBadge } from "@/components/dashboard/primitives"
import { shortAddress, strategies, tradingWallets, type TradingWallet } from "@/lib/data"
import { currentPlan } from "@/lib/plans"

export function ManageWalletsSection() {
  const [wallets, setWallets] = useState<TradingWallet[]>(tradingWallets)
  const [copied, setCopied] = useState<number | null>(null)

  const totals = useMemo(() => {
    const balance = wallets.reduce((sum, wallet) => sum + wallet.balanceUsd, 0)
    const sol = wallets.reduce((sum, wallet) => sum + wallet.balanceSol, 0)
    const pnl = wallets.reduce((sum, wallet) => sum + wallet.pnl, 0)
    const positions = wallets.reduce((sum, wallet) => sum + wallet.openPositions, 0)
    const active = wallets.filter((wallet) => wallet.status === "Active").length
    return { balance, sol, pnl, positions, active }
  }, [wallets])

  function toggleStatus(id: number) {
    setWallets((current) =>
      current.map((wallet) =>
        wallet.id === id
          ? { ...wallet, status: wallet.status === "Active" ? "Paused" : "Active" }
          : wallet
      )
    )
  }

  function assignStrategy(id: number, strategy: string) {
    setWallets((current) =>
      current.map((wallet) =>
        wallet.id === id
          ? {
              ...wallet,
              assignedStrategy: strategy === "none" ? null : strategy,
              status: strategy === "none" ? "Draft" : wallet.status,
            }
          : wallet
      )
    )
  }

  function removeWallet(id: number) {
    setWallets((current) => current.filter((wallet) => wallet.id !== id))
  }

  async function copyAddress(wallet: TradingWallet) {
    await navigator.clipboard.writeText(wallet.address)
    setCopied(wallet.id)
    setTimeout(() => setCopied(null), 1500)
  }

  const seatsUsed = wallets.length
  const seatLimit = currentPlan.limits.tradingWallets
  const seatPct = Math.min(100, Math.round((seatsUsed / seatLimit) * 100))

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Trading Wallets"
        description="Create, fund and assign the trading wallets that execute your synchronized strategies on-chain."
      >
        <Button variant="outline" size="lg">
          <KeyRound data-icon="inline-start" />
          Import wallet
        </Button>
        <CreateWalletDialog />
      </SectionHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total balance"
          value={`$${totals.balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          sub={`${totals.sol.toFixed(2)} SOL`}
          icon={Wallet}
          delta={9.42}
        />
        <StatCard
          label="Unrealized PnL"
          value={`$${totals.pnl.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          sub="across all wallets"
          icon={Coins}
          delta={6.18}
        />
        <StatCard
          label="Open positions"
          value={String(totals.positions)}
          sub={`${totals.active} wallets active`}
          icon={Layers}
        />
        <StatCard
          label="Wallet seats"
          value={`${seatsUsed} of ${seatLimit}`}
          sub={`${currentPlan.name} plan`}
          icon={KeyRound}
        />
      </div>

      <Card className="py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">Trading wallets</h2>
            <p className="text-xs text-muted-foreground">
              Each wallet executes one strategy with its own balance and risk envelope.
            </p>
          </div>
          <Badge variant="outline" className="tabular">
            {seatsUsed}/{seatLimit} seats used
          </Badge>
        </div>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Wallet</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead className="text-right">Positions</TableHead>
                  <TableHead className="text-right">PnL (30D)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                          <Wallet className="size-4" />
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-medium">{wallet.label}</span>
                          <button
                            type="button"
                            onClick={() => copyAddress(wallet)}
                            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <span className="tabular">{shortAddress(wallet.address)}</span>
                            {copied === wallet.id ? (
                              <Check className="size-3 text-success" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                            <span className="sr-only">Copy wallet address</span>
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm tabular">
                          {wallet.balanceSol.toFixed(2)} SOL
                        </span>
                        <span className="text-xs text-muted-foreground tabular">
                          ${wallet.balanceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex w-24 flex-col gap-1.5">
                        <Progress value={wallet.allocated} className="h-1.5" />
                        <span className="text-xs text-muted-foreground tabular">
                          {wallet.allocated}% deployed
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={wallet.assignedStrategy ?? "none"}
                        onValueChange={(value) => assignStrategy(wallet.id, String(value))}
                      >
                        <SelectTrigger size="sm" className="w-[170px]">
                          <SelectValue>
                            {(value: string) =>
                              value === "none" ? "Unassigned" : value
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {strategies.map((strategy) => (
                              <SelectItem key={strategy.id} value={strategy.name}>
                                {strategy.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {wallet.openPositions}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end leading-tight">
                        <Money value={wallet.pnl} />
                        <span className="text-xs text-muted-foreground tabular">
                          {wallet.pnlPct > 0 ? "+" : ""}
                          {wallet.pnlPct.toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={wallet.status} />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreVertical />
                              <span className="sr-only">
                                Actions for {wallet.label}
                              </span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => toggleStatus(wallet.id)}>
                              {wallet.status === "Active" ? <Pause /> : <Play />}
                              {wallet.status === "Active" ? "Pause wallet" : "Activate wallet"}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ArrowDownToLine />
                              Deposit funds
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ArrowUpFromLine />
                              Withdraw funds
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyAddress(wallet)}>
                              <Copy />
                              Copy address
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => removeWallet(wallet.id)}
                          >
                            <Trash2 />
                            Remove wallet
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Capital allocation</CardTitle>
            <CardDescription>
              Share of total balance held by each trading wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {wallets.map((wallet) => {
              const share = totals.balance
                ? Math.round((wallet.balanceUsd / totals.balance) * 100)
                : 0
              return (
                <div key={wallet.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{wallet.label}</span>
                    <span className="text-xs text-muted-foreground tabular">
                      ${wallet.balanceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} ·{" "}
                      {share}%
                    </span>
                  </div>
                  <Progress value={share} className="h-1.5" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wallet seats</CardTitle>
            <CardDescription>
              Your {currentPlan.name} plan includes {seatLimit} dedicated trading wallets.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-semibold tracking-tight tabular">
                {seatsUsed}
              </span>
              <span className="pb-1 text-sm text-muted-foreground">/ {seatLimit} used</span>
            </div>
            <Progress value={seatPct} className="h-1.5" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Each wallet keeps its own keypair, balance and execution history so a single
              strategy failure never touches the rest of your capital.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CreateWalletDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="lg">
            <Plus data-icon="inline-start" />
            New wallet
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create trading wallet</DialogTitle>
          <DialogDescription>
            A fresh keypair is generated and encrypted. Fund it afterwards to start executing.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="wallet-label">Wallet label</FieldLabel>
            <Input id="wallet-label" placeholder="TW Momentum" />
            <FieldDescription>Shown across activity logs and alerts.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="wallet-strategy">Assign strategy</FieldLabel>
            <Select defaultValue="none">
              <SelectTrigger id="wallet-strategy" className="w-full">
                <SelectValue>
                  {(value: string) => (value === "none" ? "Assign later" : value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Assign later</SelectItem>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.name}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="wallet-cap">Max deployable balance</FieldLabel>
            <Input id="wallet-cap" placeholder="75" inputMode="numeric" />
            <FieldDescription>
              Percentage of the wallet balance strategies may deploy at once.
            </FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <DialogClose render={<Button>Create wallet</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
