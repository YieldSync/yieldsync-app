"use client"

import { useMemo, useState } from "react"
import {
  Download,
  FolderPlus,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Wallet,
  Filter,
  CircleOff,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
  FieldDescription,
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
import { cn } from "@/lib/utils"
import type { WalletList } from "@/lib/wallets/types"

export function SyncWalletsSection() {
  const {
    wallets,
    lists,
    loading,
    error,
    trackWallet,
    removeWallet,
    addList,
    removeList,
    downloadCsv,
  } = useWalletsData()

  const [query, setQuery] = useState("")
  const [listFilter, setListFilter] = useState<string>("all")
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
      const matchesList =
        listFilter === "all" ||
        (wallet.lists ?? []).some((l) => l.id === listFilter)
      return matchesQuery && matchesStatus && matchesList
    })
  }, [wallets, query, status, listFilter])

  const activeCount = wallets.filter((w) => w.status === "active").length

  async function onAdd(input: {
    address: string
    name?: string
    listIds?: string[]
  }) {
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
        description="Manage tracked wallets and organize them into lists for your strategies."
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
        <CreateListDialog
          onCreate={async (name) => {
            await addList({ name })
          }}
        />
        <ImportWalletDialog
          lists={lists}
          busy={busy}
          onImport={async (rows, listId) => {
            for (const row of rows) {
              await onAdd({
                address: row.address,
                name: row.name,
                listIds: listId ? [listId] : undefined,
              })
            }
          }}
        />
        <AddWalletDialog
          lists={lists}
          busy={busy}
          onAdd={async (input) => {
            await onAdd(input)
          }}
        />
      </SectionHeader>

      {error ? (
        <p role="alert" className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {formError ? (
        <p role="alert" className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tracked Wallets"
          value={loading ? "…" : String(wallets.length)}
          sub={`${activeCount} active`}
          icon={Wallet}
        />
        <StatCard
          label="Lists"
          value={loading ? "…" : String(lists.length)}
          sub="wallet groups"
          icon={List}
        />
        <StatCard
          label="In selected list"
          value={loading ? "…" : String(filtered.length)}
          sub={
            listFilter === "all"
              ? "all lists"
              : lists.find((l) => l.id === listFilter)?.name ?? "list"
          }
          icon={Filter}
        />
        <StatCard
          label="Unlisted"
          value={
            loading
              ? "…"
              : String(wallets.filter((w) => !(w.lists ?? []).length).length)
          }
          sub="no list membership"
          icon={CircleOff}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="h-fit py-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Lists</h2>
            <p className="text-xs text-muted-foreground">Filter tracked wallets</p>
          </div>
          <CardContent className="flex flex-col gap-1 px-2 py-2">
            <button
              type="button"
              onClick={() => setListFilter("all")}
              className={cn(
                "flex w-full items-center justify-between rounded-none px-3 py-2 text-left text-sm",
                listFilter === "all"
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <span>All wallets</span>
              <span className="tabular text-xs">{wallets.length}</span>
            </button>
            {lists.map((list) => (
              <div key={list.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setListFilter(list.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-between rounded-none px-3 py-2 text-left text-sm",
                    listFilter === list.id
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <span className="truncate">{list.name}</span>
                  <span className="tabular text-xs">{list.wallet_count ?? 0}</span>
                </button>
                {list.name !== "My Wallets" ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100"
                    aria-label={`Delete list ${list.name}`}
                    onClick={() => void removeList(list.id)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            ))}
            {loading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Loading lists…</p>
            ) : null}
            {!loading && lists.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No lists yet.</p>
            ) : null}
          </CardContent>
        </Card>

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
                    <TableHead>Lists</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-5 py-8 text-sm text-muted-foreground">
                        Loading wallets…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-5 py-8 text-sm text-muted-foreground">
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
                          <div className="flex flex-wrap gap-1">
                            {(wallet.lists ?? []).length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              (wallet.lists ?? []).map((list) => (
                                <Badge key={list.id} variant="outline">
                                  {list.name}
                                </Badge>
                              ))
                            )}
                          </div>
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
    </div>
  )
}

function CreateListDialog({
  onCreate,
}: {
  onCreate: (name: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="lg">
            <FolderPlus data-icon="inline-start" />
            New list
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create list</DialogTitle>
          <DialogDescription>
            Group tracked wallets (e.g. Whales, LP desks) for filtering.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="list-name">List name</FieldLabel>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Smart Money"
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            disabled={busy || !name.trim()}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setError(null)
                try {
                  await onCreate(name.trim())
                  setName("")
                  setOpen(false)
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed")
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Create list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddWalletDialog({
  lists,
  busy,
  onAdd,
}: {
  lists: WalletList[]
  busy: boolean
  onAdd: (input: {
    address: string
    name?: string
    listIds?: string[]
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState("")
  const [label, setLabel] = useState("")
  const [listId, setListId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const defaultList = lists.find((l) => l.name === "My Wallets")?.id ?? lists[0]?.id ?? ""

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setListId(defaultList)
      }}
    >
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
          <Field>
            <FieldLabel htmlFor="wallet-list">List</FieldLabel>
            <Select
              value={listId || defaultList}
              onValueChange={(v) => setListId(String(v))}
            >
              <SelectTrigger id="wallet-list" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>Assign this wallet to a list.</FieldDescription>
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
                  const id = listId || defaultList
                  await onAdd({
                    address: address.trim(),
                    name: label.trim() || undefined,
                    listIds: id ? [id] : undefined,
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
  lists,
  busy,
  onImport,
}: {
  lists: WalletList[]
  busy: boolean
  onImport: (
    rows: { address: string; name?: string }[],
    listId?: string,
  ) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState("")
  const [listId, setListId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const defaultList = lists.find((l) => l.name === "My Wallets")?.id ?? lists[0]?.id ?? ""

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setListId(defaultList)
      }}
    >
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
          <Field>
            <FieldLabel htmlFor="import-list-select">List</FieldLabel>
            <Select
              value={listId || defaultList}
              onValueChange={(v) => setListId(String(v))}
            >
              <SelectTrigger id="import-list-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
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
                  await onImport(rows, listId || defaultList || undefined)
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
