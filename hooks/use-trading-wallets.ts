"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getTradingWalletQuota,
  listTradingWallets,
  removeTradingWallet,
  updateTradingWalletLabel,
  upsertTradingWallet,
  type TradingWalletQuota,
  type TradingWalletRow,
} from "@/lib/trading-wallets/api"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export function useTradingWallets() {
  const [wallets, setWallets] = useState<TradingWalletRow[]>([])
  const [quota, setQuota] = useState<TradingWalletQuota>({
    maxTradingWallets: 0,
    planName: "free",
    planLabel: "Starter",
    isAdmin: false,
    canCreate: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Redeploy with NEXT_PUBLIC_SUPABASE_* env.")
      setLoading(false)
      return
    }
    setError(null)
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session?.user) {
        setWallets([])
        setError("Sign in to manage trading wallets.")
        setLoading(false)
        return
      }
    }
    try {
      const [rows, q] = await Promise.all([
        listTradingWallets(supabase),
        getTradingWalletQuota(supabase),
      ])
      setWallets(rows)
      setQuota(q)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trading wallets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const add = useCallback(
    async (input: { address: string; label?: string }) => {
      const supabase = createClient()
      await upsertTradingWallet(supabase, {
        address: input.address,
        label: input.label,
        source: "imported",
        reactivate: true,
      })
      await refresh()
    },
    [refresh],
  )

  const rename = useCallback(
    async (address: string, label: string) => {
      const supabase = createClient()
      await updateTradingWalletLabel(supabase, address, label)
      await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (address: string) => {
      const supabase = createClient()
      await removeTradingWallet(supabase, address)
      await refresh()
    },
    [refresh],
  )

  return { wallets, quota, loading, error, refresh, add, rename, remove }
}
