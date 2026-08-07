"use client"

import { useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
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
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { syncWallets } from "@/lib/data"

export function StrategyBuilder() {
  const [sizingMode, setSizingMode] = useState("percentage")
  const [slippage, setSlippage] = useState([1.5])
  const [autoSell, setAutoSell] = useState(true)
  const [assigned, setAssigned] = useState<string[]>([
    syncWallets[0].address,
    syncWallets[1].address,
  ])

  function toggleWallet(address: string) {
    setAssigned((current) =>
      current.includes(address)
        ? current.filter((item) => item !== address)
        : [...current, address]
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Strategy Builder</CardTitle>
        <CardDescription>
          Define how detected trades from your assigned sync wallets are executed on-chain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="strategy-name">Strategy name</FieldLabel>
            <Input id="strategy-name" placeholder="Momentum Long" />
          </Field>

          <FieldSet>
            <FieldLegend variant="label">Assign sync wallets</FieldLegend>
            <FieldDescription>
              {assigned.length} of {syncWallets.length} wallets assigned to this rule.
            </FieldDescription>
            <div className="grid gap-2 sm:grid-cols-2">
              {syncWallets.map((wallet) => (
                <Field key={wallet.address} orientation="horizontal">
                  <Checkbox
                    id={`assign-${wallet.address}`}
                    checked={assigned.includes(wallet.address)}
                    onCheckedChange={() => toggleWallet(wallet.address)}
                  />
                  <FieldLabel htmlFor={`assign-${wallet.address}`} className="font-normal">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate">{wallet.label}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {wallet.score}
                      </Badge>
                    </span>
                  </FieldLabel>
                </Field>
              ))}
            </div>
          </FieldSet>

          <FieldSeparator />

          <Field>
            <FieldLabel>Position size</FieldLabel>
            <ToggleGroup
              value={[sizingMode]}
              onValueChange={(value) => value[0] && setSizingMode(value[0] as string)}
              variant="outline"
              spacing={0}
            >
              <ToggleGroupItem value="fixed">Fixed amount</ToggleGroupItem>
              <ToggleGroupItem value="percentage">Percentage</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>
              {sizingMode === "fixed"
                ? "Every mirrored trade uses the same notional size."
                : "Each mirrored trade scales with your available balance."}
            </FieldDescription>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="position-value">
                {sizingMode === "fixed" ? "Amount per trade" : "Percent of balance"}
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="position-value"
                  defaultValue={sizingMode === "fixed" ? "1.00" : "2.5"}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>{sizingMode === "fixed" ? "SOL" : "%"}</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="max-buy">Maximum buy amount</FieldLabel>
              <InputGroup>
                <InputGroupInput id="max-buy" defaultValue="5.00" />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>SOL</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="stop-loss">Stop loss</FieldLabel>
              <InputGroup>
                <InputGroupInput id="stop-loss" defaultValue="25" />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="take-profit">Take profit</FieldLabel>
              <InputGroup>
                <InputGroupInput id="take-profit" defaultValue="120" />
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
                onValueChange={(value) => setSlippage(value as number[])}
                min={0.1}
                max={10}
                step={0.1}
                className="flex-1"
              />
              <span className="w-16 text-right text-sm font-medium tabular">
                {slippage[0].toFixed(1)}%
              </span>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="priority-fee">Priority fee</FieldLabel>
            <InputGroup>
              <InputGroupInput id="priority-fee" defaultValue="0.0005" />
              <InputGroupAddon align="inline-end">
                <InputGroupText>SOL</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              Higher fees improve landing probability during congestion.
            </FieldDescription>
          </Field>

          <FieldSeparator />

          <FieldSet>
            <FieldLegend variant="label">Token filters</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="whitelist">Whitelist</FieldLabel>
                <Textarea id="whitelist" rows={3} placeholder="SOL, JUP, PYTH" />
                <FieldDescription>Only these tokens will be executed.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="blacklist">Blacklist</FieldLabel>
                <Textarea id="blacklist" rows={3} placeholder="BONK, WIF" />
                <FieldDescription>These tokens are always skipped.</FieldDescription>
              </Field>
            </div>
          </FieldSet>

          <Field orientation="horizontal">
            <Switch id="auto-sell" checked={autoSell} onCheckedChange={setAutoSell} />
            <FieldLabel htmlFor="auto-sell" className="font-normal">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Auto sell</span>
                <span className="text-xs text-muted-foreground">
                  Mirror exits automatically when the source wallet closes a position.
                </span>
              </span>
            </FieldLabel>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t border-border">
        <Button variant="outline">
          <Save data-icon="inline-start" />
          Save as draft
        </Button>
        <Button>
          <Rocket data-icon="inline-start" />
          Create strategy
        </Button>
      </CardFooter>
    </Card>
  )
}
