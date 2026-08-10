"use client"

import { useCallback, useEffect, useState } from "react"
import {
  createCopyStrategy,
  deleteCopyStrategy,
  listCopyStrategies,
  setCopyStrategyEnabled,
  type CopyStrategy,
  type CopyStrategyInput,
} from "@/lib/copy-strategies/api"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export function useStrategies() {
  const [strategies, setStrategies] = useState<CopyStrategy[]>([])
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
        setStrategies([])
        setError("Sign in to manage strategies.")
        setLoading(false)
        return
      }
    }
    try {
      setStrategies(await listCopyStrategies(supabase))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load strategies")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (input: CopyStrategyInput) => {
      const supabase = createClient()
      const row = await createCopyStrategy(supabase, input)
      await refresh()
      return row
    },
    [refresh],
  )

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const supabase = createClient()
      await setCopyStrategyEnabled(supabase, id, enabled)
      await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      const supabase = createClient()
      await deleteCopyStrategy(supabase, id)
      await refresh()
    },
    [refresh],
  )

  return { strategies, loading, error, refresh, create, setEnabled, remove }
}
