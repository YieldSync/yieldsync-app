import type { SupabaseClient } from "@supabase/supabase-js";
import type { Wallet, WalletList, WalletListStatus } from "./types";

function errMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    const m = (err as { message?: string }).message;
    if (m) return m;
  }
  return fallback;
}

export async function getSessionUserId(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(errMessage(error, "Auth failed"));
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

/**
 * Ensures profile + default "My Wallets" list.
 * Prefers DB RPC; falls back to client inserts if migration not applied yet.
 */
export async function ensureWalletBootstrap(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("ensure_wallet_bootstrap");
  if (!error) return data as string;

  // PGRST202 = function not found in schema cache
  const code = (error as { code?: string }).code;
  const msg = error.message || "";
  const missingFn =
    code === "PGRST202" ||
    msg.toLowerCase().includes("ensure_wallet_bootstrap") ||
    msg.toLowerCase().includes("could not find the function");

  if (!missingFn) {
    throw new Error(errMessage(error, "Wallet bootstrap failed"));
  }

  return ensureWalletBootstrapClient(supabase);
}

async function ensureWalletBootstrapClient(supabase: SupabaseClient) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw new Error(errMessage(userErr, "Auth failed"));
  if (!user) throw new Error("Not signed in");

  const { data: plans } = await supabase
    .from("plans")
    .select("id")
    .eq("name", "free")
    .limit(1);

  const freePlanId = plans?.[0]?.id ?? null;

  const { error: profileErr } = await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      plan_id: freePlanId,
      email: user.email ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  // ignoreDuplicates may still error without INSERT policy — try select first
  if (profileErr) {
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!existing) {
      throw new Error(
        `${profileErr.message} — run migration 20260724180000_wallets_rls.sql in Supabase SQL Editor.`,
      );
    }
  }

  const { data: existingList, error: listSelErr } = await supabase
    .from("wallet_lists")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "My Wallets")
    .maybeSingle();

  if (listSelErr) {
    throw new Error(
      `${listSelErr.message} — run migration 20260724180000_wallets_rls.sql (RLS policies for wallet_lists).`,
    );
  }

  if (existingList?.id) return existingList.id as string;

  const { data: created, error: listInsErr } = await supabase
    .from("wallet_lists")
    .insert({
      user_id: user.id,
      name: "My Wallets",
      status: "active",
    })
    .select("id")
    .single();

  if (listInsErr) {
    throw new Error(
      `${listInsErr.message} — run migration 20260724180000_wallets_rls.sql so you can create lists.`,
    );
  }

  return created.id as string;
}

export async function fetchWalletLists(supabase: SupabaseClient) {
  await ensureWalletBootstrap(supabase);

  const { data: lists, error } = await supabase
    .from("wallet_lists")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `${error.message} — check RLS on wallet_lists (migration 20260724180000_wallets_rls.sql).`,
    );
  }

  const { data: memberships, error: mErr } = await supabase
    .from("wallet_list_memberships")
    .select("list_id");

  if (mErr) {
    throw new Error(
      `${mErr.message} — check RLS on wallet_list_memberships.`,
    );
  }

  const counts = new Map<string, number>();
  for (const m of memberships ?? []) {
    counts.set(m.list_id, (counts.get(m.list_id) ?? 0) + 1);
  }

  return (lists ?? []).map((l) => ({
    ...l,
    status: (l.status === "archived" ? "archived" : "active") as WalletListStatus,
    wallet_count: counts.get(l.id) ?? 0,
  })) as WalletList[];
}

export async function fetchWallets(supabase: SupabaseClient) {
  await ensureWalletBootstrap(supabase);

  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `${error.message} — check RLS on wallets (migration 20260724180000_wallets_rls.sql).`,
    );
  }

  const { data: memberships, error: mErr } = await supabase
    .from("wallet_list_memberships")
    .select("wallet_id, list_id, wallet_lists ( id, name, status )");

  if (mErr) {
    // Nested embed can fail if RLS blocks; fall back to wallets without lists
    return (wallets ?? []).map((w) => ({
      ...w,
      lists: [],
    })) as Wallet[];
  }

  const listsByWallet = new Map<
    string,
    { id: string; name: string; status: string }[]
  >();

  for (const m of memberships ?? []) {
    const row = m as {
      wallet_id: string;
      list_id: string;
      wallet_lists:
        | { id: string; name: string; status: string }
        | { id: string; name: string; status: string }[]
        | null;
    };
    const list = Array.isArray(row.wallet_lists)
      ? row.wallet_lists[0]
      : row.wallet_lists;
    if (!list) continue;
    const arr = listsByWallet.get(row.wallet_id) ?? [];
    arr.push({
      id: list.id,
      name: list.name,
      status: list.status,
    });
    listsByWallet.set(row.wallet_id, arr);
  }

  return (wallets ?? []).map((w) => ({
    ...w,
    lists: listsByWallet.get(w.id) ?? [],
  })) as Wallet[];
}

export async function createWalletList(
  supabase: SupabaseClient,
  input: { name: string; status?: WalletListStatus },
) {
  const userId = await getSessionUserId(supabase);
  await ensureWalletBootstrap(supabase);

  const status: WalletListStatus =
    input.status === "archived" ? "archived" : "active";

  const { data, error } = await supabase
    .from("wallet_lists")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      status,
    })
    .select("*")
    .single();

  if (error) throw new Error(errMessage(error, "Failed to create list"));
  return data as WalletList;
}

export async function deleteWalletList(
  supabase: SupabaseClient,
  listId: string,
) {
  const { error } = await supabase
    .from("wallet_lists")
    .delete()
    .eq("id", listId);
  if (error) throw new Error(errMessage(error, "Failed to delete list"));
}

export async function addWallet(
  supabase: SupabaseClient,
  input: {
    address: string;
    name?: string;
    listIds?: string[];
  },
) {
  const userId = await getSessionUserId(supabase);
  const defaultListId = await ensureWalletBootstrap(supabase);
  const address = input.address.trim();

  const { data: wallet, error } = await supabase
    .from("wallets")
    .insert({
      user_id: userId,
      address,
      name: input.name?.trim() || null,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You are already tracking this wallet.");
    }
    throw new Error(
      `${errMessage(error, "Failed to add wallet")} — if this persists, run migration 20260724180000_wallets_rls.sql.`,
    );
  }

  const listIds =
    input.listIds && input.listIds.length > 0
      ? input.listIds
      : [defaultListId];

  const rows = listIds.map((list_id) => ({
    list_id,
    wallet_id: wallet.id,
  }));

  const { error: mErr } = await supabase
    .from("wallet_list_memberships")
    .insert(rows);

  if (mErr && mErr.code !== "23505") {
    throw new Error(errMessage(mErr, "Wallet saved but list membership failed"));
  }

  return wallet as Wallet;
}

export async function deleteWallet(
  supabase: SupabaseClient,
  walletId: string,
) {
  const { error } = await supabase.from("wallets").delete().eq("id", walletId);
  if (error) throw new Error(errMessage(error, "Failed to delete wallet"));
}

export async function exportWalletsCsv(wallets: Wallet[]) {
  const header = ["address", "name", "status", "created_at", "lists"];
  const lines = wallets.map((w) => {
    const lists = (w.lists ?? []).map((l) => l.name).join("|");
    return [w.address, w.name ?? "", w.status, w.created_at, lists]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}
