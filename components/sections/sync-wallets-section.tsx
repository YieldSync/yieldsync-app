"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
import { Textarea } from "@/components/ui/textarea"
import {
  Money,
  SectionHeader,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/primitives"
import { shortAddress, syncWallets } from "@/lib/data"
import { cn } from "@/lib/utils"

export function SyncWalletsSection() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")

  const rows = useMemo(
    () =>
      syncWallets.filter((wallet) => {
        const matchesQuery =
          query.trim() === "" ||
          wallet.label.toLowerCase().includes(query.toLowerCase()) ||
          wallet.address.toLowerCase().includes(query.toLowerCase())
        const matchesStatus = status === "all" || wallet.status.toLowerCase() === status
        return matchesQuery && matchesStatus
      }),
    [query, status]
  )

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Tracking Wallets"
        description="Manage the wallets you track and synchronize into your execution layer."
      >
        <ImportWalletDialog />
        <AddWalletDialog />
      </SectionHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tracked Wallets" value="14" sub="of 20 seats" icon={RefreshCw} />
        <StatCard label="Healthy" value="11" sub="health ≥ 80" delta={3.4} icon={Activity} />
        <StatCard label="Copied Trades (7D)" value="659" delta={9.8} icon={Download} />
        <StatCard label="Aggregated 7D PnL" value="+$10,363.90" delta={11.2} icon={Eye} />
      </div>

      <Card className="py-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <InputGroup className="max-w-sm flex-1">
            <InputGroupInput
              placeholder="Filter synced wallets…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
          <Select value={status} onValueChange={(value) => setStatus(value as string)}>
            <SelectTrigger className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="syncing">Syncing</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="error">Error</SelectItem>
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
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">7D PNL</TableHead>
                  <TableHead className="w-36">Health</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Sync Status</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((wallet) => (
                  <TableRow key={wallet.address}>
                    <TableCell className="pl-5 font-medium tabular">
                      {shortAddress(wallet.address)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium">{wallet.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {wallet.strategy}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{wallet.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular">{wallet.score}</TableCell>
                    <TableCell className="text-right">
                      <Money value={wallet.pnl7d} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={wallet.health}
                          className={cn(
                            "h-1.5 w-16",
                            wallet.health < 60 && "[&>div]:bg-destructive"
                          )}
                        />
                        <span className="text-xs tabular text-muted-foreground">
                          {wallet.health}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular">
                      {wallet.lastActivity}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={wallet.status} />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label="Wallet actions">
                              <MoreHorizontal />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuGroup>
                            <DropdownMenuItem>
                              <Eye />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RefreshCw />
                              Sync now
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive">
                            <Trash2 />
                            Remove
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
    </div>
  )
}

function AddWalletDialog() {
  return (
    <Dialog>
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
          <DialogTitle>Add sync wallet</DialogTitle>
          <DialogDescription>
            Register a wallet address to monitor and mirror into your strategies.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="wallet-address">Wallet address</FieldLabel>
            <Input id="wallet-address" placeholder="7xPqK4mN8vR2tYuI9oL3aS6dF1gH5jK2b" />
            <FieldDescription>Solana, Base, Ethereum and Arbitrum supported.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="wallet-label">Label</FieldLabel>
            <Input id="wallet-label" placeholder="Momentum Desk" />
          </Field>
          <Field>
            <FieldLabel htmlFor="wallet-category">Category</FieldLabel>
            <Select defaultValue="Smart Money">
              <SelectTrigger id="wallet-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Whale">Whale</SelectItem>
                  <SelectItem value="Smart Money">Smart Money</SelectItem>
                  <SelectItem value="Trader">Trader</SelectItem>
                  <SelectItem value="Investor">Investor</SelectItem>
                  <SelectItem value="Bot">Bot</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <DialogClose render={<Button>Add wallet</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportWalletDialog() {
  return (
    <Dialog>
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
              placeholder={"7xPqK4mN8vR2tYuI9oL3aS6dF1gH5jK2b, Solana OG\n9kLmN2pQ7rS4tU8vW1xY6zA3bC5dE9fG, Momentum Desk"}
            />
            <FieldDescription>Up to 25 wallets per import batch.</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <DialogClose render={<Button>Import wallets</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
