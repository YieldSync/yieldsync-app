"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePrivy, useSigners, useUser } from "@privy-io/react-auth"
import { useCreateWallet, useExportWallet } from "@privy-io/react-auth/solana"
import {
  Check,
  Copy,
  KeyRound,
  Layers,
  Plus,
  ShieldOff,
  Trash2,
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
import { revokeExecutionWalletAccess } from "@/lib/copy-strategies/api"
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
import { getPrivySignerId } from "@/lib/privy/signer"
import { copyToClipboard, truncateAddress } from "@/lib/utils"
import { WalletLink } from "@/components/wallet/wallet-link"

type WalletPermissions = {
  walletId: string
  address: string
  yieldsyncGranted: boolean
  yieldsyncSignerId: string | null
  additionalSigners: { signerId: string; policyIds: string[] }[]
}

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
  const yieldsyncSignerId = getPrivySignerId()
  const { ready, authenticated, user } = usePrivy()
  const { refreshUser } = useUser()
  const {
    session: ysSession,
    loading: ysLoading,
    configured: ysConfigured,
    supabase,
  } = useSupabaseAuth()
  const { createWallet } = useCreateWallet()
  const { exportWallet } = useExportWallet()
  const { removeSigners } = useSigners()

  const [busy, setBusy] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [dbRows, setDbRows] = useState<TradingWalletRow[]>([])
  const [balances, setBalances] = useState<
    Record<string, { lamports: number; sol: number; ok: boolean; error?: string }>
  >({})
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [permissionsByWalletId, setPermissionsByWalletId] = useState<
    Record<string, WalletPermissions>
  >({})
  const [permissionsLoading, setPermissionsLoading] = useState(false)
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

  const mutating =
    busy === "create" ||
    (busy?.startsWith("delete:") ?? false) ||
    (busy?.startsWith("label:") ?? false) ||
    (busy?.startsWith("revoke:") ?? false)

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

  const refreshPermissions = useCallback(async (walletIds: string[]) => {
    const ids = walletIds.filter(Boolean)
    if (ids.length === 0) {
      setPermissionsByWalletId({})
      return
    }
    setPermissionsLoading(true)
    try {
      const res = await fetch("/api/trading-wallets/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletIds: ids }),
        cache: "no-store",
      })
      const json = (await res.json().catch(() => null)) as {
        permissions?: WalletPermissions[]
        error?: string
      } | null
      if (!res.ok) {
        setError(json?.error || "Could not load YieldSync permissions from Privy.")
        return
      }
      const next: Record<string, WalletPermissions> = {}
      for (const row of json?.permissions ?? []) {
        next[row.walletId] = row
      }
      setPermissionsByWalletId(next)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load YieldSync permissions from Privy.",
      )
    } finally {
      setPermissionsLoading(false)
    }
  }, [])

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

  const visibleAddressesKey = useMemo(
    () =>
      visibleWallets
        .map((w) => w.address)
        .sort()
        .join(","),
    [visibleWallets],
  )

  const visibleWalletIdsKey = useMemo(
    () =>
      visibleWallets
        .map((w) => w.id)
        .filter(Boolean)
        .sort()
        .join(","),
    [visibleWallets],
  )

  useEffect(() => {
    if (!visibleAddressesKey) {
      setBalances({})
      setBalancesLoading(false)
      return
    }
    const addresses = visibleAddressesKey.split(",")
    let cancelled = false
    setBalancesLoading(true)
    void (async () => {
      try {
        const res = await fetch("/api/trading-wallets/balances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses }),
          cache: "no-store",
        })
        const json = (await res.json().catch(() => null)) as {
          balances?: {
            address: string
            lamports?: number
            sol?: number
            ok?: boolean
            error?: string
          }[]
          error?: string
        } | null
        if (cancelled) return
        if (!res.ok) {
          setError(
            json?.error || "Could not load SOL balances from backend.",
          )
          setBalances({})
          return
        }
        const next: Record<
          string,
          { lamports: number; sol: number; ok: boolean; error?: string }
        > = {}
        for (const row of json?.balances ?? []) {
          next[row.address] = {
            lamports: Number(row.lamports ?? 0),
            sol: Number(row.sol ?? 0),
            ok: Boolean(row.ok),
            error: row.error,
          }
        }
        setBalances(next)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load SOL balances from backend.",
          )
        }
      } finally {
        if (!cancelled) setBalancesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visibleAddressesKey])

  useEffect(() => {
    if (!visibleWalletIdsKey) {
      setPermissionsByWalletId({})
      return
    }
    void refreshPermissions(visibleWalletIdsKey.split(","))
  }, [visibleWalletIdsKey, refreshPermissions])

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

      // No session signers here — YieldSync access is granted when a strategy starts.
      const created = await createWallet({
        createAdditional: privyWallets.length > 0,
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
      setMessage(
        "Wallet created via Privy. YieldSync signing rights are granted when you start a strategy.",
      )
    } catch {
      setError("Something went wrong creating the wallet. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  async function onExport(address: string) {
    setError(null)
    setMessage(null)
    setExporting(address)
    try {
      await Promise.race([
        exportWallet({ address }),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1500)
        }),
      ])
    } catch {
      setError("Export failed. Please try again.")
    } finally {
      setExporting(null)
    }
  }

  async function onRevoke(address: string, walletId?: string) {
    if (!supabase) return
    if (
      !window.confirm(
        "Revoke YieldSync signing rights on this wallet?\n\nActive strategies using this wallet will be paused. You can grant access again when you start a strategy.",
      )
    ) {
      return
    }
    setError(null)
    setMessage(null)
    setBusy(`revoke:${address}`)
    try {
      await removeSigners({ address })
      try {
        await refreshUser()
      } catch {
        // optional
      }
      const paused = await revokeExecutionWalletAccess(supabase, address)
      if (walletId) {
        await refreshPermissions([walletId])
      }
      setMessage(
        paused > 0
          ? `YieldSync access revoked. ${paused} strateg${paused === 1 ? "y" : "ies"} paused.`
          : "YieldSync access revoked.",
      )
    } catch {
      setError("Could not revoke YieldSync access. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  async function onDelete(address: string) {
    if (!supabase) return
    const bal = balances[address]
    if (balancesLoading || !bal) {
      setError("Balance still loading. Try again in a moment.")
      return
    }
    if (!bal.ok) {
      setError(
        bal.error ||
          "Could not verify SOL balance. Delete is only allowed when balance is known and zero.",
      )
      return
    }
    if (bal.lamports > 0) {
      setError(
        `Cannot remove wallet with ${bal.sol.toFixed(4)} SOL. Withdraw all funds first, then delete.`,
      )
      return
    }
    const label =
      labelByAddress.get(address)?.trim() || truncateAddress(address, 6)
    if (
      !window.confirm(
        `Remove “${label}” from YieldSync?\n\nBalance is 0 SOL. The wallet disappears from your list. Export the private key first if you still need it outside YieldSync.`,
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
      setBalances((prev) => {
        const next = { ...prev }
        delete next[address]
        return next
      })
      setMessage("Wallet removed.")
    } catch {
      setError("Could not remove wallet. Please try again.")
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
        description="Non-custodial Solana wallets via Privy. YieldSync signing rights are granted only when you start a strategy."
      >
        <Button
          size="lg"
          disabled={
            mutating ||
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
              Create generates an embedded Solana wallet. Starting a strategy asks
              Privy for YieldSync signing rights
              {yieldsyncSignerId ? ` (${yieldsyncSignerId})` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Label</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>SOL</TableHead>
                    <TableHead>YieldSync access</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!labelsReady ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="px-5 py-8 text-sm text-muted-foreground"
                      >
                        Loading trading wallets…
                      </TableCell>
                    </TableRow>
                  ) : visibleWallets.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="px-5 py-8 text-sm text-muted-foreground"
                      >
                        No trading wallets yet. Create one with Privy to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleWallets.map((wallet) => {
                      const label =
                        labelByAddress.get(wallet.address) || "Wallet"
                      const bal = balances[wallet.address]
                      const balText = balancesLoading
                        ? "…"
                        : !bal
                          ? "—"
                          : bal.ok
                            ? bal.sol.toFixed(4)
                            : "err"
                      const canDelete =
                        Boolean(bal?.ok) && bal!.lamports === 0 && !balancesLoading
                      const perms = wallet.id
                        ? permissionsByWalletId[wallet.id]
                        : undefined
                      const granted = perms?.yieldsyncGranted === true
                      const accessText = permissionsLoading
                        ? "…"
                        : !wallet.id
                          ? "—"
                          : !perms
                            ? "—"
                            : granted
                              ? "Granted"
                              : "Not granted"
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
                            <div className="inline-flex items-center gap-1.5">
                              <WalletLink
                                address={wallet.address}
                                className="hover:text-foreground"
                              />
                              <button
                                type="button"
                                className="inline-flex items-center hover:text-foreground"
                                aria-label="Copy address"
                                onClick={() => void onCopy(wallet.address)}
                              >
                                {copied === wallet.address ? (
                                  <Check className="size-3.5 text-primary" />
                                ) : (
                                  <Copy className="size-3.5 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell
                            className="tabular text-muted-foreground"
                            title={bal?.error}
                          >
                            {balText}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span
                                className={
                                  granted
                                    ? "text-sm text-foreground"
                                    : "text-sm text-muted-foreground"
                                }
                              >
                                {accessText}
                              </span>
                              {granted ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 justify-start px-0 text-xs"
                                  disabled={busy === `revoke:${wallet.address}`}
                                  onClick={() =>
                                    void onRevoke(wallet.address, wallet.id)
                                  }
                                >
                                  <ShieldOff className="size-3.5" />
                                  {busy === `revoke:${wallet.address}`
                                    ? "Revoking…"
                                    : "Revoke"}
                                </Button>
                              ) : null}
                            </div>
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
                                disabled={exporting === wallet.address}
                                onClick={() => void onExport(wallet.address)}
                              >
                                <KeyRound />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Remove (only when SOL balance is 0)"
                                title={
                                  canDelete
                                    ? "Remove wallet"
                                    : "Delete only when SOL balance is 0"
                                }
                                disabled={
                                  mutating ||
                                  busy === `delete:${wallet.address}` ||
                                  !canDelete
                                }
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
    </div>
  )
}
