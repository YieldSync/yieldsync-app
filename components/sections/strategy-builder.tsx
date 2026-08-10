"use client"

import { useEffect, useState } from "react"
import { Rocket, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { parseTokenList, type CopyStrategyInput } from "@/lib/copy-strategies/api"
import { shortAddress } from "@/lib/data"
import type { TradingWalletRow } from "@/lib/trading-wallets/api"
import type { Wallet } from "@/lib/wallets/types"

function asNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value) && typeof value[0] === "number" && Number.isFinite(value[0])) {
    return value[0]
  }
  return fallback
}

export function StrategyBuilder({
  syncWallets,
  tradingWallets,
  onCreate,
  onCancel,
}: {
  syncWallets: Wallet[]
  tradingWallets: TradingWalletRow[]
  onCreate: (input: CopyStrategyInput) => Promise<void>
  onCancel?: () => void
}) {
  const [name, setName] = useState("")
  const [leaderId, setLeaderId] = useState("")
  const [executionAddress, setExecutionAddress] = useState("")
  const [sizingMode, setSizingMode] = useState<"percentage" | "fixed">("percentage")
  const [copyPct, setCopyPct] = useState("25")
  const [fixedSize, setFixedSize] = useState("1.00")
  const [minBuy, setMinBuy] = useState("0.10")
  const [maxBuy, setMaxBuy] = useState("5.00")
  const [stopLoss, setStopLoss] = useState("25")
  const [takeProfit, setTakeProfit] = useState("120")
  const [slippage, setSlippage] = useState(1.5)
  const [priorityFee, setPriorityFee] = useState("0.0005")
  const [whitelist, setWhitelist] = useState("")
  const [blacklist, setBlacklist] = useState("")
  const [autoSell, setAutoSell] = useState(true)
  const [autoSellRetries, setAutoSellRetries] = useState("3")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leaderId && syncWallets[0]) setLeaderId(syncWallets[0].id)
  }, [syncWallets, leaderId])

  useEffect(() => {
    if (!executionAddress && tradingWallets[0]) {
      setExecutionAddress(tradingWallets[0].address)
    }
  }, [tradingWallets, executionAddress])

  const leader = syncWallets.find((w) => w.id === leaderId) ?? null
  const execution = tradingWallets.find((w) => w.address === executionAddress) ?? null

  async function submit(enabled: boolean) {
    setError(null)
    if (!leader) {
      setError("Select exactly one sync wallet (leader).")
      return
    }
    if (!execution) {
      setError("Select a trading wallet for execution.")
      return
    }
    const minSizeSol = Number(minBuy)
    const maxSizeSol = Number(maxBuy)
    if (!(minSizeSol > 0) || !(maxSizeSol > 0) || minSizeSol > maxSizeSol) {
      setError("Minimum buy must be > 0 and ≤ maximum buy.")
      return
    }

    setBusy(true)
    try {
      await onCreate({
        name,
        sourceWallet: leader.address,
        sourceName: leader.name,
        executionWallet: execution.address,
        executionLabel: execution.label,
        sizingMode,
        copyPct: Number(copyPct) || 25,
        fixedSizeSol: sizingMode === "fixed" ? Number(fixedSize) || null : null,
        minSizeSol,
        maxSizeSol,
        slippagePct: slippage,
        priorityFeeSol: Number(priorityFee) || 0.0005,
        stopLossPct: stopLoss.trim() ? Number(stopLoss) : null,
        takeProfitPct: takeProfit.trim() ? Number(takeProfit) : null,
        tokenWhitelist: parseTokenList(whitelist),
        tokenBlacklist: parseTokenList(blacklist),
        autoSell,
        autoSellRetries: Number(autoSellRetries) || 0,
        enabled,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save strategy")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Strategy Builder</CardTitle>
        <CardDescription>
          One sync wallet leads; one trading wallet executes mirrored trades.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="strategy-name">Strategy name</FieldLabel>
            <Input
              id="strategy-name"
              placeholder="Momentum Long"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <FieldSet>
            <FieldLegend variant="label">Sync wallet (leader)</FieldLegend>
            <FieldDescription>
              Exactly one tracked wallet. Its opens/closes drive this strategy.
            </FieldDescription>
            {syncWallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add a tracking wallet first.
              </p>
            ) : (
              <Select value={leaderId} onValueChange={(v) => setLeaderId(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select leader wallet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {syncWallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {(wallet.name || shortAddress(wallet.address)) +
                          ` · ${shortAddress(wallet.address)}`}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">Trading wallet (execution)</FieldLegend>
            <FieldDescription>
              The funded wallet that places mirrored trades.
            </FieldDescription>
            {tradingWallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add a trading wallet first.
              </p>
            ) : (
              <Select
                value={executionAddress}
                onValueChange={(v) => setExecutionAddress(String(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select trading wallet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {tradingWallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.address}>
                        {wallet.label} · {shortAddress(wallet.address)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </FieldSet>

          <FieldSeparator />

          <Field>
            <FieldLabel>Position size</FieldLabel>
            <ToggleGroup
              value={[sizingMode]}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value
                if (next === "fixed" || next === "percentage") setSizingMode(next)
              }}
              variant="outline"
              spacing={0}
            >
              <ToggleGroupItem value="fixed">Fixed amount</ToggleGroupItem>
              <ToggleGroupItem value="percentage">Percentage</ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="position-value">
                {sizingMode === "fixed" ? "Amount per trade" : "Percent of leader size"}
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="position-value"
                  value={sizingMode === "fixed" ? fixedSize : copyPct}
                  onChange={(e) =>
                    sizingMode === "fixed"
                      ? setFixedSize(e.target.value)
                      : setCopyPct(e.target.value)
                  }
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>{sizingMode === "fixed" ? "SOL" : "%"}</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="min-buy">Minimum buy amount</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="min-buy"
                  value={minBuy}
                  onChange={(e) => setMinBuy(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>SOL</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>Skip buys below this size.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="max-buy">Maximum buy amount</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="max-buy"
                  value={maxBuy}
                  onChange={(e) => setMaxBuy(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>SOL</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="stop-loss">Stop loss</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="stop-loss"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="take-profit">Take profit</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="take-profit"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="slippage">Slippage tolerance</FieldLabel>
            <div className="flex items-center gap-4">
              <Slider
                id="slippage"
                value={slippage}
                onValueChange={(value) => setSlippage(asNumber(value, slippage))}
                min={0.1}
                max={10}
                step={0.1}
                className="flex-1"
              />
              <span className="w-16 text-right text-sm font-medium tabular">
                {Number.isFinite(slippage) ? slippage.toFixed(1) : "—"}%
              </span>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="priority-fee">Priority fee</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="priority-fee"
                value={priorityFee}
                onChange={(e) => setPriorityFee(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>SOL</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <FieldSeparator />

          <FieldSet>
            <FieldLegend variant="label">Token filters</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="whitelist">Whitelist</FieldLabel>
                <Textarea
                  id="whitelist"
                  rows={3}
                  value={whitelist}
                  onChange={(e) => setWhitelist(e.target.value)}
                  placeholder="SOL, JUP, PYTH"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="blacklist">Blacklist</FieldLabel>
                <Textarea
                  id="blacklist"
                  rows={3}
                  value={blacklist}
                  onChange={(e) => setBlacklist(e.target.value)}
                  placeholder="BONK, WIF"
                />
              </Field>
            </div>
          </FieldSet>

          <Field orientation="horizontal">
            <Switch id="auto-sell" checked={autoSell} onCheckedChange={setAutoSell} />
            <FieldLabel htmlFor="auto-sell" className="font-normal">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Auto sell</span>
                <span className="text-xs text-muted-foreground">
                  Mirror exits when the leader closes a position.
                </span>
              </span>
            </FieldLabel>
          </Field>

          {autoSell ? (
            <Field>
              <FieldLabel htmlFor="auto-sell-retries">Auto sell retries</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="auto-sell-retries"
                  value={autoSellRetries}
                  onChange={(e) => setAutoSellRetries(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>tries</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Retry failed sells (e.g. slippage) up to this many times. Default 3.
              </FieldDescription>
            </Field>
          ) : null}

          {leader && execution ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Leader {shortAddress(leader.address)}</Badge>
              <Badge variant="outline">Exec {shortAddress(execution.address)}</Badge>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t border-border">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button variant="outline" disabled={busy} onClick={() => void submit(false)}>
          <Save data-icon="inline-start" />
          Save as draft
        </Button>
        <Button disabled={busy} onClick={() => void submit(true)}>
          <Rocket data-icon="inline-start" />
          Create strategy
        </Button>
      </CardFooter>
    </Card>
  )
}
