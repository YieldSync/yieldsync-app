"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type CurrentUserProfile = {
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  planName: string;
  maxWallets: number;
  maxTradingWallets: number;
  isAdmin: boolean;
};

export type CurrentUserState = {
  user: User | null;
  profile: CurrentUserProfile | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};

function labelFromUser(user: User, profile: CurrentUserProfile | null) {
  if (profile?.displayName?.trim()) return profile.displayName.trim();
  if (user.email) return user.email.split("@")[0] || user.email;
  if (profile?.walletAddress) {
    return `${profile.walletAddress.slice(0, 4)}…${profile.walletAddress.slice(-4)}`;
  }
  return "Account";
}

function initialFromLabel(label: string) {
  const ch = label.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

export function useCurrentUser(): CurrentUserState & {
  label: string;
  initial: string;
  email: string | null;
} {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const {
        data: { user: authUser },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      setUser(authUser);

      if (!authUser) {
        setProfile(null);
        return;
      }

      // Prefer full select (admin + trading quotas). Fall back if migration not applied.
      let row: Record<string, unknown> | null = null;
      let profileErrMsg: string | null = null;

      const full = await supabase
        .from("user_profiles")
        .select(
          "email, display_name, avatar_url, wallet_address, is_admin, plans ( name, max_wallets, max_trading_wallets )",
        )
        .eq("id", authUser.id)
        .maybeSingle();

      if (full.error) {
        profileErrMsg = full.error.message;
        const basic = await supabase
          .from("user_profiles")
          .select(
            "email, display_name, avatar_url, wallet_address, plans ( name, max_wallets )",
          )
          .eq("id", authUser.id)
          .maybeSingle();
        if (basic.error) {
          setProfile({
            email: authUser.email ?? null,
            displayName: null,
            avatarUrl: null,
            walletAddress: null,
            planName: "free",
            maxWallets: 3,
            maxTradingWallets: 1,
            isAdmin: false,
          });
          setError(basic.error.message);
          return;
        }
        row = basic.data as Record<string, unknown> | null;
      } else {
        row = full.data as Record<string, unknown> | null;
      }

      const planRel = row?.plans as
        | {
            name?: string;
            max_wallets?: number;
            max_trading_wallets?: number;
          }
        | {
            name?: string;
            max_wallets?: number;
            max_trading_wallets?: number;
          }[]
        | null
        | undefined;
      const plan = Array.isArray(planRel) ? planRel[0] : planRel;
      const isAdmin = Boolean(row?.is_admin);
      let maxTrading =
        typeof plan?.max_trading_wallets === "number"
          ? plan.max_trading_wallets
          : 0;
      if (isAdmin) maxTrading = Math.max(maxTrading, 10);
      else if ((plan?.name ?? "free") !== "pro") {
        maxTrading = Math.max(maxTrading, 1);
      }

      setProfile({
        email: (row?.email as string | null) ?? authUser.email ?? null,
        displayName: (row?.display_name as string | null) ?? null,
        avatarUrl: (row?.avatar_url as string | null) ?? null,
        walletAddress: (row?.wallet_address as string | null) ?? null,
        planName: plan?.name ?? "free",
        maxWallets:
          typeof plan?.max_wallets === "number" ? plan.max_wallets : 3,
        maxTradingWallets: maxTrading,
        isAdmin,
      });
      if (profileErrMsg) setError(profileErrMsg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.assign("/login");
  }, []);

  const label = useMemo(
    () => (user ? labelFromUser(user, profile) : "Guest"),
    [user, profile],
  );
  const initial = useMemo(() => initialFromLabel(label), [label]);
  const email = profile?.email ?? user?.email ?? null;

  return {
    user,
    profile,
    loading,
    error,
    reload: load,
    signOut,
    label,
    initial,
    email,
  };
}
