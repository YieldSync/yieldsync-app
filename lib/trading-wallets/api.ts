import type { SupabaseClient } from "@supabase/supabase-js";
import { withMigrationHint } from "@/lib/supabase/errors";
import { ensureWalletBootstrap } from "@/lib/wallets/api";

/** Table: public.copy_trading_wallets (Privy execution wallets) */
const TABLE = "copy_trading_wallets";

/** Fallback Pro quota — real limit comes from plans.max_trading_wallets */
export const DEFAULT_PRO_TRADING_WALLETS = 10;

export type TradingWalletRow = {
  id: string;
  user_id: string;
  address: string;
  label: string;
  source: "created" | "imported";
  status: "active" | "removed";
  created_at: string;
  updated_at: string;
};

type DbRow = {
  id: string;
  user_id: string;
  wallet_address: string;
  name: string | null;
  label: string | null;
  source: string;
  status: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type TradingWalletQuota = {
  maxTradingWallets: number
  /** Raw DB plan name: free | pro | … */
  planName: string
  /** UI label: Starter | Professional | … */
  planLabel: string
  isAdmin: boolean
  canCreate: boolean
}

export function planDisplayName(planName: string, isAdmin = false) {
  if (isAdmin || planName === "pro") return "Professional"
  if (planName === "free") return "Starter"
  if (!planName) return "Starter"
  return planName.charAt(0).toUpperCase() + planName.slice(1)
}

function errMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    const m = (err as { message?: string }).message;
    if (m) return m;
  }
  return fallback;
}

function mapRow(row: DbRow): TradingWalletRow {
  return {
    id: row.id,
    user_id: row.user_id,
    address: row.wallet_address,
    label: (row.label || row.name || "Wallet").trim() || "Wallet",
    source: row.source === "imported" ? "imported" : "created",
    status: row.status === "removed" ? "removed" : "active",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getTradingWalletQuota(
  supabase: SupabaseClient,
): Promise<TradingWalletQuota> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      maxTradingWallets: 0,
      planName: "free",
      planLabel: "Starter",
      isAdmin: false,
      canCreate: false,
    };
  }

  const { data: row } = await supabase
    .from("user_profiles")
    .select("is_admin, plans ( name, max_trading_wallets )")
    .eq("id", user.id)
    .maybeSingle();

  const planRel = row?.plans as
    | { name?: string; max_trading_wallets?: number }
    | { name?: string; max_trading_wallets?: number }[]
    | null
    | undefined;
  const plan = Array.isArray(planRel) ? planRel[0] : planRel;
  const isAdmin = Boolean(row?.is_admin);
  const planName = plan?.name ?? "free";
  let max =
    typeof plan?.max_trading_wallets === "number"
      ? plan.max_trading_wallets
      : planName === "pro"
        ? DEFAULT_PRO_TRADING_WALLETS
        : 1;
  if (isAdmin) max = Math.max(max, DEFAULT_PRO_TRADING_WALLETS);
  // Free always at least 1 for testing
  if (planName !== "pro" && !isAdmin) max = Math.max(max, 1);

  const { count } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  const active = count ?? 0;
  return {
    maxTradingWallets: max,
    planName,
    planLabel: planDisplayName(planName, isAdmin),
    isAdmin,
    canCreate: max > 0 && active < max,
  };
}

export async function listTradingWallets(
  supabase: SupabaseClient,
  opts?: { includeRemoved?: boolean },
): Promise<TradingWalletRow[]> {
  let q = supabase.from(TABLE).select("*").order("created_at", {
    ascending: true,
  });
  if (!opts?.includeRemoved) {
    q = q.eq("status", "active");
  }
  const { data, error } = await q;
  if (error) {
    throw new Error(
      withMigrationHint(
        errMessage(error, "Failed to load trading wallets"),
        "20260725151000_copy_trading_tables.sql",
      ),
    );
  }
  return ((data ?? []) as DbRow[]).map(mapRow);
}

/** Upsert pubkey for current user; preserves existing label unless provided. */
export async function upsertTradingWallet(
  supabase: SupabaseClient,
  input: {
    address: string;
    label?: string;
    source?: "created" | "imported";
    reactivate?: boolean;
  },
): Promise<TradingWalletRow> {
  await ensureWalletBootstrap(supabase);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw new Error(errMessage(userErr, "Auth failed"));
  if (!user) throw new Error("Not signed in");

  const address = input.address.trim();
  const existing = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", user.id)
    .eq("wallet_address", address)
    .maybeSingle();

  if (existing.data) {
    const row = mapRow(existing.data as DbRow);
    if (row.status === "removed" && !input.reactivate) {
      return row;
    }
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.label != null) {
      const label = input.label.trim();
      patch.label = label;
      patch.name = label;
    }
    if (input.source) patch.source = input.source;
    if (input.reactivate) {
      patch.status = "active";
      patch.enabled = true;
    }

    if (input.reactivate && row.status === "removed") {
      const quota = await getTradingWalletQuota(supabase);
      const { count } = await supabase
        .from(TABLE)
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");
      if ((count ?? 0) >= quota.maxTradingWallets) {
        throw new Error(
          quota.maxTradingWallets === 0
            ? "Trading wallets require Pro."
            : `Maximum ${quota.maxTradingWallets} trading wallets.`,
        );
      }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw new Error(errMessage(error, "Failed to update trading wallet"));
    return mapRow(data as DbRow);
  }

  const quota = await getTradingWalletQuota(supabase);
  const { count } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  if ((count ?? 0) >= quota.maxTradingWallets) {
    throw new Error(
      quota.maxTradingWallets === 0
        ? "Trading wallets require a Pro plan. Upgrade to create wallets."
        : `Maximum ${quota.maxTradingWallets} trading wallets on your plan.`,
    );
  }

  const n = (count ?? 0) + 1;
  const label = (input.label ?? `Wallet ${n}`).trim() || `Wallet ${n}`;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: user.id,
      wallet_address: address,
      name: label,
      label,
      source: input.source ?? "created",
      status: "active",
      enabled: true,
    })
    .select("*")
    .single();

  if (error) throw new Error(errMessage(error, "Failed to save trading wallet"));
  return mapRow(data as DbRow);
}

export async function updateTradingWalletLabel(
  supabase: SupabaseClient,
  address: string,
  label: string,
): Promise<TradingWalletRow> {
  const trimmed = label.trim() || "Wallet";
  // Upsert so label works even if sync hasn't written the row yet
  return upsertTradingWallet(supabase, {
    address: address.trim(),
    label: trimmed,
  });
}

/**
 * Soft-remove from YieldSync. Embedded Privy wallets cannot be hard-deleted
 * via unlinkWallet (external wallets only).
 */
export async function removeTradingWallet(
  supabase: SupabaseClient,
  address: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from(TABLE)
    .update({
      status: "removed",
      enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("wallet_address", address.trim());

  if (error) throw new Error(errMessage(error, "Failed to remove trading wallet"));
}

/**
 * Keep Supabase rows in sync with Privy linked addresses.
 * Does not resurrect soft-removed wallets. Skips new upserts over quota.
 */
export async function syncTradingWalletsFromPrivy(
  supabase: SupabaseClient,
  privyWallets: { address: string; imported?: boolean }[],
): Promise<TradingWalletRow[]> {
  await ensureWalletBootstrap(supabase);
  const allRows = await listTradingWallets(supabase, { includeRemoved: true });
  const removed = new Set(
    allRows.filter((r) => r.status === "removed").map((r) => r.address),
  );
  const activeSet = new Set(
    allRows.filter((r) => r.status === "active").map((r) => r.address),
  );
  const quota = await getTradingWalletQuota(supabase);

  for (const w of privyWallets) {
    if (removed.has(w.address)) continue;
    if (activeSet.has(w.address)) continue;
    if (activeSet.size >= quota.maxTradingWallets) break;
    try {
      await upsertTradingWallet(supabase, {
        address: w.address,
        source: w.imported ? "imported" : "created",
      });
      activeSet.add(w.address);
    } catch {
      break;
    }
  }

  return listTradingWallets(supabase);
}
