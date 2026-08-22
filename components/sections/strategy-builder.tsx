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
import {
  parseOptionalNumber,
  parseTokenList,
  type CopyStrategy,
  type CopyStrategyInput,
  type StrategyStatus,
} from "@/lib/copy-strategies/api"
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

function optStr(n: number | null | undefined) {
  return n == null ? "" : String(n)
}

export function StrategyBuilder({
  syncWallets,
  tradingWallets,
  initial = null,
  onSave,
  onCancel,
}: {
  syncWallets: Wallet[]
  tradingWallets: TradingWalletRow[]
  initial?: CopyStrategy | null
  onSave: (input: CopyStrategyInput) => Promise<void>
  onCancel?: () => void
}) {
  const editing = Boolean(initial?.id)
  const [name, setName] = useState("")
  const [leaderAddress, setLeaderAddress] = useState("")
  const [executionAddress, setExecutionAddress] = useState("")
  const [sizingMode, setSizingMode] = useState<"percentage" | "fixed">("percentage")
  const [copyPct, setCopyPct] = useState("25")
  const [fixedSize, setFixedSize] = useState("1.00")
  const [minBuy, setMinBuy] = useState("0.10")
  const [maxBuy, setMaxBuy] = useState("") // empty = no limit
  const [maxPositions, setMaxPositions] = useState("10")
  const [stopLoss, setStopLoss] = useState("25")
  const [takeProfit, setTakeProfit] = useState("120")
  const [slippage, setSlippage] = useState(1.5)
  const [priorityFee, setPriorityFee] = useState("0.0005")
  const [whitelist, setWhitelist] = useState("")
  const [blacklist, setBlacklist] = useState("")
  const [autoSell, setAutoSell] = useState(true)
  const [autoSellRetries, setAutoSellRetries] = useState("3")
  const [solSideOnly, setSolSideOnly] = useState(true)
  const [includeUsdcPools, setIncludeUsdcPools] = useState(false)
  const [scoreTrades, setScoreTrades] = useState(false)
  const [minPoolAge, setMinPoolAge] = useState("")
  const [maxPoolAge, setMaxPoolAge] = useState("")
  const [skipBlacklisted, setSkipBlacklisted] = useState(true)
  const [requireFreezeDisabled, setRequireFreezeDisabled] = useState(true)
  const [requireVerified, setRequireVerified] = useState(false)
  const [minHolders, setMinHolders] = useState("")
  const [minMarketCap, setMinMarketCap] = useState("")
  const [maxMarketCap, setMaxMarketCap] = useState("")
  const [minTvl, setMinTvl] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initial) return
    setName(initial.name || "")
    setLeaderAddress(initial.sourceWallet || "")
    setExecutionAddress(initial.executionWallet || "")
    setSizingMode(initial.sizingMode === "fixed" ? "fixed" : "percentage")
    setCopyPct(String(initial.copyPct ?? 25))
    setFixedSize(String(initial.fixedSizeSol ?? 1))
    setMinBuy(String(initial.minSizeSol ?? 0.1))
    setMaxBuy(optStr(initial.maxSizeSol))
    setMaxPositions(String(initial.maxPositions ?? 10))
    setStopLoss(optStr(initial.stopLossPct))
    setTakeProfit(optStr(initial.takeProfitPct))
    setSlippage(initial.slippagePct ?? 1.5)
    setPriorityFee(String(initial.priorityFeeSol ?? 0.0005))
    setWhitelist((initial.tokenWhitelist ?? []).join(", "))
    setBlacklist((initial.tokenBlacklist ?? []).join(", "))
    setAutoSell(initial.autoSell)
    setAutoSellRetries(String(initial.autoSellRetries ?? 3))
    setSolSideOnly(initial.solSideOnly)
    setIncludeUsdcPools(initial.includeUsdcPools)
    setScoreTrades(initial.scoreTrades)
    setMinPoolAge(optStr(initial.minPoolAgeMinutes))
    setMaxPoolAge(optStr(initial.maxPoolAgeMinutes))
    setSkipBlacklisted(initial.skipBlacklisted)
    setRequireFreezeDisabled(initial.requireFreezeAuthorityDisabled)
    setRequireVerified(initial.requireVerified)
    setMinHolders(optStr(initial.minHolders))
    setMinMarketCap(optStr(initial.minMarketCapUsd))
    setMaxMarketCap(optStr(initial.maxMarketCapUsd))
    setMinTvl(optStr(initial.minTvlUsd))
  }, [initial])

  useEffect(() => {
    if (initial) return
    if (!leaderAddress && syncWallets[0]) setLeaderAddress(syncWallets[0].address)
  }, [syncWallets, leaderAddress, initial])

  useEffect(() => {
    if (initial) return
    if (!executionAddress && tradingWallets[0]) {
      setExecutionAddress(tradingWallets[0].address)
    }
  }, [tradingWallets, executionAddress, initial])

  const leader =
    syncWallets.find((w) => w.address === leaderAddress) ?? null
  const execution =
    tradingWallets.find((w) => w.address === executionAddress) ?? null

  function leaderLabel(wallet: Wallet) {
    return `${wallet.name || shortAddress(wallet.address)} · ${shortAddress(wallet.address)}`
  }

  function executionLabel(wallet: TradingWalletRow) {
    return `${wallet.label} · ${shortAddress(wallet.address)}`
  }

  async function submit(mode: "draft" | "enable" | "save") {
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
    const maxSizeSol = parseOptionalNumber(maxBuy)
    const maxOpen = Math.round(Number(maxPositions) || 10)
    if (!(minSizeSol > 0)) {
      setError("Minimum buy must be > 0.")
      return
    }
    if (maxSizeSol != null && minSizeSol > maxSizeSol) {
      setError("Minimum buy must be ≤ max position size.")
      return
    }
    if (!(maxOpen >= 1 && maxOpen <= 100)) {
      setError("Max open positions must be between 1 and 100.")
      return
    }
    const minPoolAgeMinutes = parseOptionalNumber(minPoolAge)
    const maxPoolAgeMinutes = parseOptionalNumber(maxPoolAge)
    if (
      minPoolAgeMinutes != null &&
      maxPoolAgeMinutes != null &&
      minPoolAgeMinutes > maxPoolAgeMinutes
    ) {
      setError("Min pool age must be ≤ max pool age.")
      return
    }
    const minMarketCapUsd = parseOptionalNumber(minMarketCap)
    const maxMarketCapUsd = parseOptionalNumber(maxMarketCap)
    if (
      minMarketCapUsd != null &&
      maxMarketCapUsd != null &&
      minMarketCapUsd > maxMarketCapUsd
    ) {
      setError("Min market cap must be ≤ max market cap.")
      return
    }

    let status: StrategyStatus
    if (mode === "draft") status = "draft"
    else if (mode === "enable") status = "active"
    else status = initial?.status === "paused" ? "paused" : "active"

    setBusy(true)
    try {
      await onSave({
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
        maxPositions: maxOpen,
        slippagePct: slippage,
        priorityFeeSol: Number(priorityFee) || 0.0005,
        stopLossPct: stopLoss.trim() ? Number(stopLoss) : null,
        takeProfitPct: takeProfit.trim() ? Number(takeProfit) : null,
        tokenWhitelist: parseTokenList(whitelist),
        tokenBlacklist: parseTokenList(blacklist),
        autoSell,
        autoSellRetries: Number(autoSellRetries) || 0,
        minPoolAgeMinutes,
        maxPoolAgeMinutes,
        skipBlacklisted,
        requireFreezeAuthorityDisabled: requireFreezeDisabled,
        requireVerified,
        minHolders: parseOptionalNumber(minHolders),
        minMarketCapUsd,
        maxMarketCapUsd,
        minTvlUsd: parseOptionalNumber(minTvl),
        solSideOnly,
        includeUsdcPools,
        scoreTrades,
        status,
        enabled: status === "active",
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
        <CardTitle className="text-base">
          {editing ? "Edit strategy" : "Strategy Builder"}
        </CardTitle>
        <CardDescription>
          {editing
            ? "Update rules, then save as draft or enable copying."
            : "One sync wallet leads; one trading wallet executes mirrored trades."}
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
              <Select
                value={leaderAddress}
                onValueChange={(v) => setLeaderAddress(String(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select leader wallet">
                    {leader ? leaderLabel(leader) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {syncWallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.address}>
                        {leaderLabel(wallet)}
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
                  <SelectValue placeholder="Select trading wallet">
                    {execution ? executionLabel(execution) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {tradingWallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.address}>
                        {executionLabel(wallet)}
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
              <FieldLabel htmlFor="max-buy">Max position size</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="max-buy"
                  placeholder="No limit"
                  value={maxBuy}
                  onChange={(e) => setMaxBuy(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>SOL</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Optional cap per mirrored position. Leave empty for no limit.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="max-positions">Max open positions</FieldLabel>
              <Input
                id="max-positions"
                inputMode="numeric"
                value={maxPositions}
                onChange={(e) => setMaxPositions(e.target.value)}
              />
              <FieldDescription>
                Concurrent follower positions before new opens are skipped.
              </FieldDescription>
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
            <FieldLegend variant="label">Copy style</FieldLegend>
            <Field orientation="horizontal">
              <Switch
                id="sol-side-only"
                checked={solSideOnly}
                onCheckedChange={setSolSideOnly}
              />
              <FieldLabel htmlFor="sol-side-only" className="font-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">Only copy SOL-side entries</span>
                  <span className="text-xs text-muted-foreground">
                    {solSideOnly
                      ? "Skip token-side deposits (avoids swap round trips)."
                      : "Also copy token-side entries — more trades, each may need a swap."}
                  </span>
                </span>
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Switch
                id="include-usdc"
                checked={includeUsdcPools}
                onCheckedChange={setIncludeUsdcPools}
              />
              <FieldLabel htmlFor="include-usdc" className="font-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">Include USDC pools</span>
                  <span className="text-xs text-muted-foreground">
                    {includeUsdcPools
                      ? "Copy USDC-paired pools (SOL may be swapped on entry/exit)."
                      : "SOL-paired pools only."}
                  </span>
                </span>
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Switch
                id="score-trades"
                checked={scoreTrades}
                onCheckedChange={setScoreTrades}
              />
              <FieldLabel htmlFor="score-trades" className="font-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">Score trades before copying</span>
                  <span className="text-xs text-muted-foreground">
                    {scoreTrades
                      ? "Size/skip using trade score (when scoring is wired)."
                      : "Copy at full size. Honeypot/rug hard-blocks stay separate."}
                  </span>
                </span>
              </FieldLabel>
            </Field>
          </FieldSet>

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

          <FieldSeparator />

          <FieldSet>
            <FieldLegend variant="label">Pool entry filters</FieldLegend>
            <FieldDescription>
              Applied before opening a mirrored position. Empty numbers = no
              limit. Defaults skip blacklisted pools and require freeze authority
              disabled.
            </FieldDescription>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="min-pool-age">Min pool age</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="min-pool-age"
                    inputMode="numeric"
                    placeholder="e.g. 5"
                    value={minPoolAge}
                    onChange={(e) => setMinPoolAge(e.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>min</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="max-pool-age">Max pool age</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="max-pool-age"
                    inputMode="numeric"
                    placeholder="e.g. 1440"
                    value={maxPoolAge}
                    onChange={(e) => setMaxPoolAge(e.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>min</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="min-holders">Min holders</FieldLabel>
                <Input
                  id="min-holders"
                  inputMode="numeric"
                  placeholder="e.g. 500"
                  value={minHolders}
                  onChange={(e) => setMinHolders(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="min-tvl">Min TVL</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="min-tvl"
                    inputMode="decimal"
                    placeholder="e.g. 5000"
                    value={minTvl}
                    onChange={(e) => setMinTvl(e.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>USD</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="min-mcap">Min market cap</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="min-mcap"
                    inputMode="decimal"
                    placeholder="e.g. 50000"
                    value={minMarketCap}
                    onChange={(e) => setMinMarketCap(e.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>USD</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="max-mcap">Max market cap</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="max-mcap"
                    inputMode="decimal"
                    placeholder="optional"
                    value={maxMarketCap}
                    onChange={(e) => setMaxMarketCap(e.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>USD</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </div>

            <Field orientation="horizontal">
              <Switch
                id="skip-blacklisted"
                checked={skipBlacklisted}
                onCheckedChange={setSkipBlacklisted}
              />
              <FieldLabel htmlFor="skip-blacklisted" className="font-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">Skip blacklisted pools</span>
                  <span className="text-xs text-muted-foreground">
                    Default on — do not enter when is_blacklisted is true.
                  </span>
                </span>
              </FieldLabel>
            </Field>

            <Field orientation="horizontal">
              <Switch
                id="require-freeze-disabled"
                checked={requireFreezeDisabled}
                onCheckedChange={setRequireFreezeDisabled}
              />
              <FieldLabel htmlFor="require-freeze-disabled" className="font-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    Require freeze authority disabled
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Default on — skip tokens that still have freeze authority.
                  </span>
                </span>
              </FieldLabel>
            </Field>

            <Field orientation="horizontal">
              <Switch
                id="require-verified"
                checked={requireVerified}
                onCheckedChange={setRequireVerified}
              />
              <FieldLabel htmlFor="require-verified" className="font-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">Require verified token</span>
                  <span className="text-xs text-muted-foreground">
                    Default off — pump / unverified tokens are allowed.
                  </span>
                </span>
              </FieldLabel>
            </Field>
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
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void submit("draft")}
        >
          <Save data-icon="inline-start" />
          {busy ? "Saving…" : "Save as draft"}
        </Button>
        {editing && initial?.status !== "draft" ? (
          <Button disabled={busy} onClick={() => void submit("save")}>
            <Save data-icon="inline-start" />
            {busy ? "Saving…" : "Save changes"}
          </Button>
        ) : null}
        <Button disabled={busy} onClick={() => void submit("enable")}>
          <Rocket data-icon="inline-start" />
          {busy
            ? "Saving…"
            : editing
              ? "Save & enable"
              : "Create strategy"}
        </Button>
      </CardFooter>
    </Card>
  )
}
