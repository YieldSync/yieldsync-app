"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  addWallet,
  createWalletList,
  deleteWallet,
  deleteWalletList,
  exportWalletsCsv,
  fetchWalletLists,
  fetchWallets,
} from "@/lib/wallets/api";
import type { Wallet, WalletList, WalletListStatus } from "@/lib/wallets/types";

export function useWalletsData() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [lists, setLists] = useState<WalletList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("Sign in required.");
      setLoading(false);
      return;
    }

    setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setUserId(null);
      setWallets([]);
      setLists([]);
      setError("Sign in to manage your wallets.");
      setLoading(false);
      return;
    }

    setUserId(auth.user.id);
    try {
      const [w, l] = await Promise.all([
        fetchWallets(supabase),
        fetchWalletLists(supabase),
      ]);
      setWallets(w);
      setLists(l);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to load wallets";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const trackWallet = useCallback(
    async (input: { address: string; name?: string; listIds?: string[] }) => {
      const supabase = createClient();
      await addWallet(supabase, input);
      await refresh();
    },
    [refresh],
  );

  const removeWallet = useCallback(
    async (walletId: string) => {
      const supabase = createClient();
      await deleteWallet(supabase, walletId);
      await refresh();
    },
    [refresh],
  );

  const addList = useCallback(
    async (input: { name: string; status?: WalletListStatus }) => {
      const supabase = createClient();
      const list = await createWalletList(supabase, input);
      await refresh();
      return list;
    },
    [refresh],
  );

  const removeList = useCallback(
    async (listId: string) => {
      const supabase = createClient();
      await deleteWalletList(supabase, listId);
      await refresh();
    },
    [refresh],
  );

  const downloadCsv = useCallback(async () => {
    const csv = await exportWalletsCsv(wallets);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yieldsync-wallets.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [wallets]);

  return {
    wallets,
    lists,
    loading,
    error,
    userId,
    refresh,
    trackWallet,
    removeWallet,
    addList,
    removeList,
    downloadCsv,
  };
}
