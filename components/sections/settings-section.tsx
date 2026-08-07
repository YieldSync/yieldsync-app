"use client"

import { useState } from "react"
import { Bell, KeyRound, ShieldCheck, SlidersHorizontal, Trash2, Unplug, UserRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SectionHeader } from "@/components/dashboard/primitives"
import { AdminAppearanceCard } from "@/components/sections/admin-appearance-card"
import { shortAddress } from "@/lib/data"

const connectedWallets = [
  { address: "2A7dV8mQ3nL5pW9tR1cY6bK4sF2gH9KxL", label: "TW Main", network: "Solana" },
  { address: "9kLmN2pQ7rS4tU8vW1xY6zA3bC5dE9fG", label: "TW Growth", network: "Solana" },
  { address: "3aQ8kR1tY6uI9oP2aS5dF8gH1jK4lZ7x", label: "TW Alpha", network: "Base" },
]

const timezones = [
  { value: "cet", label: "Europe / Berlin (CET)" },
  { value: "utc", label: "UTC" },
  { value: "est", label: "America / New York (EST)" },
  { value: "sgt", label: "Asia / Singapore (SGT)" },
]

const deliveryChannels = [
  { value: "email", label: "Email only" },
  { value: "telegram", label: "Telegram only" },
  { value: "email-telegram", label: "Email and Telegram" },
  { value: "webhook", label: "Webhook" },
]

const networks = [
  { value: "solana", label: "Solana Mainnet" },
  { value: "base", label: "Base" },
  { value: "ethereum", label: "Ethereum" },
  { value: "arbitrum", label: "Arbitrum" },
]

type ToggleKey =
  | "walletActivity"
  | "largeTrades"
  | "strategyExecution"
  | "executionFailure"
  | "riskDrawdown"
  | "healthDrop"
  | "dailyDigest"
  | "milestone"

const alertGroups: {
  legend: string
  description: string
  items: { key: ToggleKey; label: string; description: string }[]
}[] = [
  {
    legend: "Wallet activity",
    description: "Signals detected on the wallets you track.",
    items: [
      {
        key: "walletActivity",
        label: "New position opened",
        description: "Notify whenever a tracked wallet enters a new token.",
      },
      {
        key: "largeTrades",
        label: "Large trade threshold",
        description: "Only notify for trades above $2,500 notional.",
      },
    ],
  },
  {
    legend: "Strategy execution",
    description: "Outcome of mirrored orders on your own wallets.",
    items: [
      {
        key: "strategyExecution",
        label: "Execution confirmed",
        description: "Notify on every successfully landed transaction.",
      },
      {
        key: "executionFailure",
        label: "Execution failed or skipped",
        description: "Notify when slippage, filters or funds block an order.",
      },
    ],
  },
  {
    legend: "Risk",
    description: "Protective signals for exposure and wallet quality.",
    items: [
      {
        key: "riskDrawdown",
        label: "Drawdown breach",
        description: "Notify when a strategy exceeds its drawdown budget.",
      },
      {
        key: "healthDrop",
        label: "Wallet health drop",
        description: "Notify when a tracked wallet health score falls below 60.",
      },
    ],
  },
  {
    legend: "Performance",
    description: "Periodic reporting on realized results.",
    items: [
      {
        key: "dailyDigest",
        label: "Daily performance digest",
        description: "A single summary of PnL, win rate and volume.",
      },
      {
        key: "milestone",
        label: "Milestone reached",
        description: "Notify when a strategy crosses a new PnL high.",
      },
    ],
  },
]

export function SettingsSection() {
  const [theme, setTheme] = useState("dark")
  const [twoFactor, setTwoFactor] = useState(true)
  const [alerts, setAlerts] = useState<Record<ToggleKey, boolean>>({
    walletActivity: true,
    largeTrades: true,
    strategyExecution: true,
    executionFailure: true,
    riskDrawdown: true,
    healthDrop: false,
    dailyDigest: true,
    milestone: false,
  })

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Settings"
        description="Profile, security, notifications and platform preferences for your YieldSync workspace."
      />

      <AdminAppearanceCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>How your account appears across the workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <Avatar className="size-14 rounded-xl">
                <AvatarFallback className="rounded-xl bg-primary/15 text-base font-semibold text-primary">
                  RW
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="avatar">Avatar</FieldLabel>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" id="avatar">
                    Upload image
                  </Button>
                  <Button variant="ghost" size="sm">
                    Remove
                  </Button>
                </div>
                <FieldDescription>PNG or JPG, up to 2 MB.</FieldDescription>
              </div>
            </Field>

            <FieldSeparator />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input id="username" defaultValue="rainer winkler" />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" defaultValue="db2022@mailbox.org" />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
              <Select defaultValue="cet" items={timezones}>
                <SelectTrigger id="timezone" className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {timezones.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t border-border">
          <Button>Save profile</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-primary" />
            Password
          </CardTitle>
          <CardDescription>
            Use at least 12 characters with numbers and symbols.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="current-password">Current password</FieldLabel>
              <Input id="current-password" type="password" placeholder="••••••••••••" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input id="new-password" type="password" />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                <Input id="confirm-password" type="password" />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t border-border">
          <Button>Update password</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" />
            Two-factor authentication
          </CardTitle>
          <CardDescription>
            Require a time-based code for logins and withdrawal actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field orientation="horizontal">
            <Switch id="two-factor" checked={twoFactor} onCheckedChange={setTwoFactor} />
            <FieldLabel htmlFor="two-factor" className="font-normal">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Authenticator app</span>
                <span className="text-xs text-muted-foreground">
                  {twoFactor
                    ? "Enabled · configured Feb 14, 2026"
                    : "Disabled · your account is protected by password only"}
                </span>
              </span>
            </FieldLabel>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected wallets</CardTitle>
          <CardDescription>Wallets authorized to execute strategy orders.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {connectedWallets.map((wallet, index) => (
            <div key={wallet.address} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{wallet.label}</span>
                  <span className="truncate text-xs text-muted-foreground tabular">
                    {shortAddress(wallet.address)}
                  </span>
                </div>
                <Badge variant="outline">{wallet.network}</Badge>
                <Button variant="ghost" size="sm">
                  <Unplug data-icon="inline-start" />
                  Disconnect
                </Button>
              </div>
              {index !== connectedWallets.length - 1 ? <Separator /> : null}
            </div>
          ))}
        </CardContent>
        <CardFooter className="border-t border-border">
          <Button variant="outline" size="sm">
            Connect wallet
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose which alerts reach you and how they are delivered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {alertGroups.map((group, index) => (
              <div key={group.legend} className="flex flex-col gap-4">
                <FieldSet>
                  <FieldLegend variant="label">{group.legend}</FieldLegend>
                  <FieldDescription>{group.description}</FieldDescription>
                  <div className="flex flex-col gap-3">
                    {group.items.map((item) => (
                      <Field key={item.key} orientation="horizontal">
                        <Switch
                          id={item.key}
                          checked={alerts[item.key]}
                          onCheckedChange={(checked) =>
                            setAlerts((current) => ({ ...current, [item.key]: checked }))
                          }
                        />
                        <FieldLabel htmlFor={item.key} className="font-normal">
                          <span className="flex flex-col gap-0.5">
                            <span className="font-medium">{item.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        </FieldLabel>
                      </Field>
                    ))}
                  </div>
                </FieldSet>
                {index !== alertGroups.length - 1 ? <FieldSeparator /> : null}
              </div>
            ))}

            <FieldSeparator />

            <Field>
              <FieldLabel htmlFor="delivery">Delivery channel</FieldLabel>
              <Select defaultValue="email-telegram" items={deliveryChannels}>
                <SelectTrigger id="delivery" className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {deliveryChannels.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t border-border">
          <Button>Save notifications</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="size-4 text-primary" />
            Preferences
          </CardTitle>
          <CardDescription>Interface and default network behavior.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Theme</FieldLabel>
              <ToggleGroup
                value={[theme]}
                onValueChange={(value) => value[0] && setTheme(value[0] as string)}
                variant="outline"
                spacing={0}
              >
                <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
                <ToggleGroupItem value="system">System</ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>
                YieldSync is optimized for the dark interface.
              </FieldDescription>
            </Field>

            <FieldSeparator />

            <Field>
              <FieldLabel htmlFor="default-network">Default network</FieldLabel>
              <Select defaultValue="solana" items={networks}>
                <SelectTrigger id="default-network" className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {networks.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="rpc">Custom RPC endpoint</FieldLabel>
              <Input id="rpc" placeholder="https://rpc.yieldsync.io/solana" />
              <FieldDescription>
                Leave empty to use the managed low-latency cluster.
              </FieldDescription>
            </Field>

            <FieldSeparator />

            <Field orientation="horizontal">
              <Switch id="compact-tables" defaultChecked />
              <FieldLabel htmlFor="compact-tables" className="font-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">Compact tables</span>
                  <span className="text-xs text-muted-foreground">
                    Show more rows per screen in data tables.
                  </span>
                </span>
              </FieldLabel>
            </Field>

            <Field orientation="horizontal">
              <Switch id="sound-alerts" />
              <FieldLabel htmlFor="sound-alerts" className="font-normal">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">Sound alerts</span>
                  <span className="text-xs text-muted-foreground">
                    Play a tone when an execution lands.
                  </span>
                </span>
              </FieldLabel>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-between border-t border-border">
          <Button>Save preferences</Button>
          <Button variant="ghost" size="sm" className="text-destructive">
            <Trash2 data-icon="inline-start" />
            Delete account
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
