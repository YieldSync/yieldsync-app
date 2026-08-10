"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import {
  addWallet,
  deleteWallet,
  exportWalletsCsv,
  fetchWallets,
} from "@/lib/wallets/api"
import type { Wallet } from "@/lib/wallets/types"

export function useWalletsData() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured. Redeploy with NEXT_PUBLIC_SUPABASE_* env.",
      )
      setLoading(false)
      return
    }

    setError(null)
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session?.user) {
        setUserId(null)
        setWallets([])
        setError("Sign in to manage your wallets.")
        setLoading(false)
        return
      }
      setUserId(sess.session.user.id)
    } else {
      setUserId(auth.user.id)
    }

    try {
      setWallets(await fetchWallets(supabase))
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to load wallets"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const trackWallet = useCallback(
    async (input: { address: string; name?: string }) => {
      const supabase = createClient()
      await addWallet(supabase, input)
      await refresh()
    },
    [refresh],
  )

  const removeWallet = useCallback(
    async (walletId: string) => {
      const supabase = createClient()
      await deleteWallet(supabase, walletId)
      await refresh()
    },
    [refresh],
  )

  const downloadCsv = useCallback(async () => {
    const csv = await exportWalletsCsv(wallets)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "yieldsync-wallets.csv"
    a.click()
    URL.revokeObjectURL(url)
  }, [wallets])

  return {
    wallets,
    loading,
    error,
    userId,
    refresh,
    trackWallet,
    removeWallet,
    downloadCsv,
  }
}
