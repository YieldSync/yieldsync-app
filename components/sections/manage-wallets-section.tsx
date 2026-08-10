"use client"

import { useState } from "react"
import {
  Check,
  Copy,
  BadgeCheck,
  MoreVertical,
  Plus,
  Trash2,
  Wallet,
  Layers,
} from "lucide-react"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SectionHeader, StatCard, StatusBadge } from "@/components/dashboard/primitives"
import { useTradingWallets } from "@/hooks/use-trading-wallets"
import { shortAddress } from "@/lib/data"

export function ManageWalletsSection() {
  const { wallets, quota, loading, error, add, rename, remove } = useTradingWallets()
  const [copied, setCopied] = useState<string | null>(null)

  const seatLimit = quota.maxTradingWallets

  async function copyAddress(address: string) {
    await navigator.clipboard.writeText(address)
    setCopied(address)
    window.setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Trading Wallets"
        description="Execution wallets that run your strategies on-chain. Add a funded Solana address you control."
      >
        <CreateTradingWalletDialog
          canCreate={quota.canCreate}
          onCreate={async (input) => {
            await add(input)
          }}
        />
      </SectionHeader>

      {error ? (
        <p role="alert" className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Trading wallets"
          value={loading ? "…" : String(wallets.length)}
          sub={`of ${seatLimit} seats`}
          icon={Wallet}
        />
        <StatCard
          label="Plan"
          value={quota.planName}
          sub={quota.canCreate ? "seats available" : "limit reached"}
          icon={Layers}
        />
        <StatCard
          label="Active"
          value={loading ? "…" : String(wallets.filter((w) => w.status === "active").length)}
          sub="ready for strategies"
          icon={BadgeCheck}
        />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Your trading wallets</CardTitle>
          <CardDescription>
            Assign these in the Strategy Builder as the execution wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Label</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-8 text-sm text-muted-foreground">
                      Loading trading wallets…
                    </TableCell>
                  </TableRow>
                ) : wallets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-8 text-sm text-muted-foreground">
                      No trading wallets yet. Create one to execute strategies.
                    </TableCell>
                  </TableRow>
                ) : (
                  wallets.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell className="pl-5 font-medium">{wallet.label}</TableCell>
                      <TableCell className="tabular">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                          onClick={() => void copyAddress(wallet.address)}
                        >
                          {shortAddress(wallet.address)}
                          {copied === wallet.address ? (
                            <Check className="size-3.5 text-primary" />
                          ) : (
                            <Copy className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {wallet.source}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={wallet.status === "active" ? "Active" : wallet.status}
                        />
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label="Actions">
                                <MoreVertical />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => {
                                  const next = window.prompt("Label", wallet.label)
                                  if (next != null && next.trim()) {
                                    void rename(wallet.address, next.trim())
                                  }
                                }}
                              >
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void copyAddress(wallet.address)}
                              >
                                <Copy />
                                Copy address
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => void remove(wallet.address)}
                            >
                              <Trash2 />
                              Remove
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

function CreateTradingWalletDialog({
  canCreate,
  onCreate,
}: {
  canCreate: boolean
  onCreate: (input: { address: string; label?: string }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState("")
  const [label, setLabel] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="lg" disabled={!canCreate}>
            <Plus data-icon="inline-start" />
            Add trading wallet
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add trading wallet</DialogTitle>
          <DialogDescription>
            Paste a Solana address you control. Fund it before enabling strategies.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="tw-address">Wallet address</FieldLabel>
            <Input
              id="tw-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="7xPq…"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tw-label">Label</FieldLabel>
            <Input
              id="tw-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Main execution"
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            disabled={busy || !address.trim()}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setError(null)
                try {
                  await onCreate({
                    address: address.trim(),
                    label: label.trim() || undefined,
                  })
                  setAddress("")
                  setLabel("")
                  setOpen(false)
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed")
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Save wallet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
