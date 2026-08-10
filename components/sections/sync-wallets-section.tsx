"use client"

import { useMemo, useState } from "react"
import {
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Wallet,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
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
import { Textarea } from "@/components/ui/textarea"
import { SectionHeader, StatCard, StatusBadge } from "@/components/dashboard/primitives"
import { useWalletsData } from "@/hooks/use-wallets-data"
import { shortAddress } from "@/lib/data"

export function SyncWalletsSection() {
  const {
    wallets,
    loading,
    error,
    trackWallet,
    removeWallet,
    downloadCsv,
  } = useWalletsData()

  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return wallets.filter((wallet) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        q === "" ||
        (wallet.name ?? "").toLowerCase().includes(q) ||
        wallet.address.toLowerCase().includes(q)
      const matchesStatus =
        status === "all" || wallet.status.toLowerCase() === status
      return matchesQuery && matchesStatus
    })
  }, [wallets, query, status])

  const activeCount = wallets.filter((w) => w.status === "active").length

  async function onAdd(input: { address: string; name?: string }) {
    setBusy(true)
    setFormError(null)
    try {
      await trackWallet(input)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add wallet")
      throw err
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Tracking Wallets"
        description="Manage Solana wallets you track as strategy leaders."
      >
        <Button
          variant="outline"
          size="lg"
          onClick={() => void downloadCsv()}
          disabled={wallets.length === 0}
        >
          <Download data-icon="inline-start" />
          Export
        </Button>
        <ImportWalletDialog
          busy={busy}
          onImport={async (rows) => {
            for (const row of rows) {
              await onAdd(row)
            }
          }}
        />
        <AddWalletDialog
          busy={busy}
          onAdd={async (input) => {
            await onAdd(input)
          }}
        />
      </SectionHeader>

      {error ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      {formError ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {formError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Tracked Wallets"
          value={loading ? "…" : String(wallets.length)}
          sub={`${activeCount} active`}
          icon={Wallet}
        />
        <StatCard
          label="Active"
          value={loading ? "…" : String(activeCount)}
          sub="ready as strategy leaders"
          icon={Activity}
        />
      </div>

      <Card className="py-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <InputGroup className="max-w-sm flex-1">
            <InputGroupInput
              placeholder="Filter tracked wallets…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
          <Select value={status} onValueChange={(value) => setStatus(String(value))}>
            <SelectTrigger className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Address</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="px-5 py-8 text-sm text-muted-foreground"
                    >
                      Loading wallets…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="px-5 py-8 text-sm text-muted-foreground"
                    >
                      No tracked wallets yet. Add a Solana address to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell className="pl-5 font-medium tabular">
                        {shortAddress(wallet.address)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {wallet.name || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            wallet.status === "active" ? "Active" : wallet.status
                          }
                        />
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Wallet actions"
                              >
                                <MoreHorizontal />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() =>
                                  void navigator.clipboard.writeText(wallet.address)
                                }
                              >
                                Copy address
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => void removeWallet(wallet.id)}
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

function AddWalletDialog({
  busy,
  onAdd,
}: {
  busy: boolean
  onAdd: (input: { address: string; name?: string }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState("")
  const [label, setLabel] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="lg">
            <Plus data-icon="inline-start" />
            Add wallet
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add tracking wallet</DialogTitle>
          <DialogDescription>
            Register a Solana wallet address to monitor as a strategy leader.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="wallet-address">Wallet address</FieldLabel>
            <Input
              id="wallet-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="7xPq…"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="wallet-label">Label</FieldLabel>
            <Input
              id="wallet-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Momentum Desk"
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
                setError(null)
                try {
                  await onAdd({
                    address: address.trim(),
                    name: label.trim() || undefined,
                  })
                  setAddress("")
                  setLabel("")
                  setOpen(false)
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed")
                }
              })()
            }}
          >
            Add wallet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportWalletDialog({
  busy,
  onImport,
}: {
  busy: boolean
  onImport: (rows: { address: string; name?: string }[]) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="lg">
            <Download data-icon="inline-start" />
            Import
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import wallets</DialogTitle>
          <DialogDescription>
            Paste one address per line. Labels can be appended after a comma.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="import-list">Addresses</FieldLabel>
            <Textarea
              id="import-list"
              rows={7}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"7xPq…, Solana OG\n9kLm…, Momentum Desk"}
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            disabled={busy || !raw.trim()}
            onClick={() => {
              void (async () => {
                setError(null)
                try {
                  const rows = raw
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => {
                      const [address, ...rest] = line.split(",")
                      return {
                        address: address.trim(),
                        name: rest.join(",").trim() || undefined,
                      }
                    })
                    .filter((r) => r.address.length > 20)
                  if (rows.length === 0) {
                    setError("No valid addresses found.")
                    return
                  }
                  await onImport(rows)
                  setRaw("")
                  setOpen(false)
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed")
                }
              })()
            }}
          >
            Import wallets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
