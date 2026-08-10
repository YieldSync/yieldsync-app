"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePrivy } from "@privy-io/react-auth"
import {
  useCreateWallet,
  useExportWallet,
  useImportWallet,
} from "@privy-io/react-auth/solana"
import {
  Check,
  Copy,
  KeyRound,
  Layers,
  Plus,
  Trash2,
  Upload,
  Wallet,
  BadgeCheck,
} from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SectionHeader, StatCard, StatusBadge } from "@/components/dashboard/primitives"
import {
  getTradingWalletQuota,
  listTradingWallets,
  removeTradingWallet,
  syncTradingWalletsFromPrivy,
  updateTradingWalletLabel,
  upsertTradingWallet,
  type TradingWalletQuota,
  type TradingWalletRow,
} from "@/lib/trading-wallets/api"
import {
  getEmbeddedSolanaWallets,
  walletAddressFromCreateResult,
} from "@/lib/trading-wallets/privy"
import { privySignerInputs } from "@/lib/privy/signer"
import { copyToClipboard, truncateAddress } from "@/lib/utils"

export function ManageWalletsSection() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader
          title="Trading Wallets"
          description="Create Privy execution wallets for your strategies."
        />
        <p className="text-sm text-muted-foreground">Loading trading wallets…</p>
      </div>
    )
  }

  return <ManageWalletsSectionInner />
}

function ManageWalletsSectionInner() {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const { ready, authenticated, user } = usePrivy()
  const {
    session: ysSession,
    loading: ysLoading,
    configured: ysConfigured,
    supabase,
  } = useSupabaseAuth()
  const { createWallet } = useCreateWallet()
  const { exportWallet } = useExportWallet()
  const { importWallet } = useImportWallet()

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importKey, setImportKey] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [dbRows, setDbRows] = useState<TradingWalletRow[]>([])
  const [quota, setQuota] = useState<TradingWalletQuota>({
    maxTradingWallets: 0,
    planName: "free",
    planLabel: "Starter",
    isAdmin: false,
    canCreate: false,
  })
  const [labelsReady, setLabelsReady] = useState(false)
  const [editingAddress, setEditingAddress] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")

  const privyWallets = useMemo(
    () => getEmbeddedSolanaWallets(user?.linkedAccounts),
    [user?.linkedAccounts],
  )

  const labelByAddress = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of dbRows) {
      if (row.status === "active") map.set(row.address, row.label)
    }
    return map
  }, [dbRows])

  const visibleWallets = useMemo(() => {
    if (!labelsReady) return []
    const active = new Set(
      dbRows.filter((r) => r.status === "active").map((r) => r.address),
    )
    return privyWallets.filter((w) => active.has(w.address))
  }, [privyWallets, dbRows, labelsReady])

  useEffect(() => {
    if (!supabase || !ysSession || !ready || !authenticated) {
      setLabelsReady(false)
      return
    }
    let cancelled = false
    setLabelsReady(false)
    void (async () => {
      try {
        const [rows, q] = await Promise.all([
          listTradingWallets(supabase),
          getTradingWalletQuota(supabase),
        ])
        if (cancelled) return
        setDbRows(rows)
        setQuota(q)
        setLabelsReady(true)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : "Failed to load trading wallets",
        )
        setLabelsReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, ysSession, ready, authenticated])

  useEffect(() => {
    if (!supabase || !ysSession || !ready || !authenticated || !labelsReady) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const rows = await syncTradingWalletsFromPrivy(supabase, privyWallets)
        if (!cancelled) setDbRows(rows)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to sync trading wallets to Supabase",
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, ysSession, ready, authenticated, labelsReady, privyWallets])

  async function onCreate() {
    setError(null)
    setMessage(null)
    if (!supabase) return
    if (!quota.canCreate) {
      setError("Trading wallet limit reached. Upgrade to Professional.")
      return
    }
    if (visibleWallets.length >= quota.maxTradingWallets) {
      setError(`Maximum ${quota.maxTradingWallets} trading wallets.`)
      return
    }
    setBusy("create")
    try {
      const beforeCount = visibleWallets.length
      const synced = await syncTradingWalletsFromPrivy(supabase, privyWallets)
      const qAfterSync = await getTradingWalletQuota(supabase)
      const activeCount = synced.filter((r) => r.status === "active").length
      setDbRows(synced)
      setQuota(qAfterSync)
      if (activeCount > beforeCount) {
        setMessage("Wallet linked.")
        return
      }
      if (!qAfterSync.canCreate || activeCount >= qAfterSync.maxTradingWallets) {
        setError(`Maximum ${qAfterSync.maxTradingWallets} trading wallets.`)
        return
      }

      const signers = privySignerInputs()
      const created = await createWallet({
        createAdditional: privyWallets.length > 0,
        ...(signers ? { signers } : {}),
      })
      const address = walletAddressFromCreateResult(created)
      if (!address) throw new Error("Wallet created but address missing.")
      await upsertTradingWallet(supabase, {
        address,
        source: "created",
      })
      const [rows, q] = await Promise.all([
        listTradingWallets(supabase),
        getTradingWalletQuota(supabase),
      ])
      setDbRows(rows)
      setQuota(q)
      setMessage("Wallet created via Privy.")
    } catch {
      setError("Something went wrong creating the wallet. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  async function onExport(address: string) {
    setError(null)
    setMessage(null)
    setBusy(`export:${address}`)
    try {
      await exportWallet({ address })
    } catch {
      setError("Export failed. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  async function onDelete(address: string) {
    if (!supabase) return
    const label =
      labelByAddress.get(address)?.trim() || truncateAddress(address, 6)
    if (
      !window.confirm(
        `Remove “${label}” from YieldSync?\n\nThe wallet disappears from your list. Funds stay on-chain. Export the private key first if you still need it outside YieldSync.`,
      )
    ) {
      return
    }
    setError(null)
    setMessage(null)
    setBusy(`delete:${address}`)
    try {
      await removeTradingWallet(supabase, address)
      setDbRows((prev) =>
        prev.map((r) =>
          r.address === address ? { ...r, status: "removed" as const } : r,
        ),
      )
      setMessage("Wallet removed.")
    } catch {
      setError("Could not remove wallet. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  async function onImport(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!quota.canCreate) {
      setError("Upgrade to Professional to create more trading wallets.")
      return
    }
    if (visibleWallets.length >= quota.maxTradingWallets) {
      setError(`Maximum ${quota.maxTradingWallets} trading wallets.`)
      return
    }
    const key = importKey.trim()
    if (!key) {
      setError("Paste a Solana private key (base58).")
      return
    }
    setBusy("import")
    try {
      const imported = await importWallet({ privateKey: key })
      const address =
        (imported as { address?: string })?.address ||
        (imported as { wallet?: { address?: string } })?.wallet?.address
      if (supabase && address) {
        await upsertTradingWallet(supabase, {
          address,
          source: "imported",
          reactivate: true,
        })
        const rows = await listTradingWallets(supabase)
        setDbRows(rows)
      }
      setImportKey("")
      setImportOpen(false)
      setMessage("Wallet imported via Privy.")
    } catch {
      setError("Import failed. Check the key and try again.")
    } finally {
      setBusy(null)
    }
  }

  async function onCopy(address: string) {
    await copyToClipboard(address)
    setCopied(address)
    window.setTimeout(() => setCopied(null), 1500)
  }

  async function saveLabel(address: string) {
    if (!supabase) return
    setBusy(`label:${address}`)
    setError(null)
    try {
      const row = await updateTradingWalletLabel(supabase, address, editLabel)
      setDbRows((prev) => prev.map((r) => (r.address === address ? row : r)))
      setEditingAddress(null)
      setMessage("Saved.")
    } catch {
      setError("Could not save label. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  if (!privyAppId) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader
          title="Trading Wallets"
          description="Create Privy execution wallets for your strategies."
        />
        <p className="text-sm text-muted-foreground">
          Privy is not configured. Set NEXT_PUBLIC_PRIVY_APP_ID and redeploy.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Trading Wallets"
        description="Non-custodial Solana wallets created with Privy. Your keys stay under your control."
      >
        <Button
          variant="outline"
          size="lg"
          disabled={
            busy !== null ||
            !quota.canCreate ||
            visibleWallets.length >= quota.maxTradingWallets
          }
          onClick={() => setImportOpen(true)}
        >
          <Upload data-icon="inline-start" />
          Import key
        </Button>
        <Button
          size="lg"
          disabled={
            busy !== null ||
            !quota.canCreate ||
            visibleWallets.length >= quota.maxTradingWallets ||
            !ready ||
            !authenticated
          }
          onClick={() => void onCreate()}
        >
          <Plus data-icon="inline-start" />
          {busy === "create" ? "Creating…" : "Create trading wallet"}
        </Button>
      </SectionHeader>

      {error ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="border border-primary/35 bg-primary/10 px-3 py-2 text-sm text-foreground"
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Trading wallets"
          value={!labelsReady ? "…" : String(visibleWallets.length)}
          sub={`of ${quota.maxTradingWallets} seats`}
          icon={Wallet}
        />
        <StatCard
          label="Plan"
          value={quota.planLabel}
          sub={quota.canCreate ? "seats available" : "limit reached"}
          icon={Layers}
        />
        <StatCard
          label="Active"
          value={!labelsReady ? "…" : String(visibleWallets.length)}
          sub="Privy embedded"
          icon={BadgeCheck}
        />
      </div>

      {(ysLoading || !ready) && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!ysLoading && ysConfigured && !ysSession && (
        <p className="text-sm text-muted-foreground">
          Sign in to manage trading wallets.{" "}
          <Link href="/login" className="text-primary hover:underline">
            Login
          </Link>
        </p>
      )}

      {!ysLoading && ysSession && ready && !authenticated && (
        <p className="text-sm text-muted-foreground">
          Connecting Privy to your YieldSync session…
        </p>
      )}

      {ready && authenticated && (
        <Card className="py-0">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">Your Privy trading wallets</CardTitle>
            <CardDescription>
              Create generates an embedded Solana wallet. Assign it in the Strategy
              Builder as the execution wallet.
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
                  {!labelsReady ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="px-5 py-8 text-sm text-muted-foreground"
                      >
                        Loading trading wallets…
                      </TableCell>
                    </TableRow>
                  ) : visibleWallets.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="px-5 py-8 text-sm text-muted-foreground"
                      >
                        No trading wallets yet. Create one with Privy to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleWallets.map((wallet) => {
                      const label =
                        labelByAddress.get(wallet.address) || "Wallet"
                      const row = dbRows.find((r) => r.address === wallet.address)
                      return (
                        <TableRow key={wallet.address}>
                          <TableCell className="pl-5 font-medium">
                            {editingAddress === wallet.address ? (
                              <form
                                className="flex max-w-xs items-center gap-2"
                                onSubmit={(e) => {
                                  e.preventDefault()
                                  void saveLabel(wallet.address)
                                }}
                              >
                                <Input
                                  value={editLabel}
                                  onChange={(e) => setEditLabel(e.target.value)}
                                  className="h-8"
                                  autoFocus
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={busy === `label:${wallet.address}`}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingAddress(null)}
                                >
                                  Cancel
                                </Button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                className="hover:underline"
                                onClick={() => {
                                  setEditingAddress(wallet.address)
                                  setEditLabel(label)
                                }}
                              >
                                {label}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="tabular">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 hover:text-foreground"
                              onClick={() => void onCopy(wallet.address)}
                            >
                              {truncateAddress(wallet.address, 4)}
                              {copied === wallet.address ? (
                                <Check className="size-3.5 text-primary" />
                              ) : (
                                <Copy className="size-3.5 text-muted-foreground" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="capitalize text-muted-foreground">
                            {row?.source ?? "created"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status="Active" />
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <div className="inline-flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Export key"
                                disabled={busy !== null}
                                onClick={() => void onExport(wallet.address)}
                              >
                                <KeyRound />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Remove"
                                disabled={busy !== null}
                                onClick={() => void onDelete(wallet.address)}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Solana key</DialogTitle>
            <DialogDescription>
              Paste a base58 private key. Privy embeds it as a trading wallet.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void onImport(e)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="import-key">Private key</FieldLabel>
                <Textarea
                  id="import-key"
                  value={importKey}
                  onChange={(e) => setImportKey(e.target.value)}
                  rows={3}
                  spellCheck={false}
                  className="font-mono text-xs"
                  placeholder="Your base58 secret key"
                />
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy === "import"}>
                {busy === "import" ? "Importing…" : "Import wallet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
