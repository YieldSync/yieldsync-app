import type { SupabaseClient } from "@supabase/supabase-js"
import type { Wallet } from "./types"

function errMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "object" && err && "message" in err) {
    const m = (err as { message?: string }).message
    if (m) return m
  }
  return fallback
}

export async function getSessionUserId(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(errMessage(error, "Auth failed"))
  if (!data.user) throw new Error("Not signed in")
  return data.user.id
}

/** Ensures the signed-in user has a profile row (no wallet lists). */
export async function ensureWalletBootstrap(supabase: SupabaseClient) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr) throw new Error(errMessage(userErr, "Auth failed"))
  if (!user) throw new Error("Not signed in")

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (existing?.id) return user.id

  const { data: plans } = await supabase
    .from("plans")
    .select("id")
    .eq("name", "free")
    .limit(1)

  const freePlanId = plans?.[0]?.id ?? null

  const { error: profileErr } = await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      plan_id: freePlanId,
      email: user.email ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true },
  )

  if (profileErr) {
    const { data: again } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
    if (!again) {
      throw new Error(errMessage(profileErr, "Failed to create profile"))
    }
  }

  return user.id
}

export async function fetchWallets(supabase: SupabaseClient) {
  await ensureWalletBootstrap(supabase)

  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(
      `${error.message} — check RLS on wallets (migration 20260724180000_wallets_rls.sql).`,
    )
  }

  return (wallets ?? []) as Wallet[]
}

export async function addWallet(
  supabase: SupabaseClient,
  input: {
    address: string
    name?: string
  },
) {
  const userId = await getSessionUserId(supabase)
  await ensureWalletBootstrap(supabase)
  const address = input.address.trim()

  const { data: wallet, error } = await supabase
    .from("wallets")
    .insert({
      user_id: userId,
      address,
      name: input.name?.trim() || null,
      status: "active",
    })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      throw new Error("You are already tracking this wallet.")
    }
    throw new Error(errMessage(error, "Failed to add wallet"))
  }

  return wallet as Wallet
}

export async function deleteWallet(supabase: SupabaseClient, walletId: string) {
  const { error } = await supabase.from("wallets").delete().eq("id", walletId)
  if (error) throw new Error(errMessage(error, "Failed to delete wallet"))
}

export async function exportWalletsCsv(wallets: Wallet[]) {
  const header = ["address", "name", "status", "created_at"]
  const lines = wallets.map((w) =>
    [w.address, w.name ?? "", w.status, w.created_at]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  )
  return [header.join(","), ...lines].join("\n")
}
