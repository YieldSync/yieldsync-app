import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  buildWalletLinkMessage,
  bytesToBase58,
} from "@/lib/auth/solana-proof";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const SOLANA_STATEMENT =
  "Sign in to YieldSync to track Meteora DLMM wallets.";

type SolanaWalletProvider = NonNullable<Window["solana"]>;

export function mapAuthError(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("missing oauth secret") ||
    lower.includes("unsupported provider")
  ) {
    return "Google is not fully configured in Supabase: open Authentication → Providers → Google, paste Client ID + Client Secret, enable the provider, then Save.";
  }
  if (lower.includes("rate limit") || lower.includes("over_email")) {
    return "Email rate limit hit (Supabase free tier). Prefer Google or Solana wallet, or disable Confirm email under Authentication → Sign In / Providers → User Signups.";
  }
  if (lower.includes("email signups are disabled")) {
    return "Email signups are disabled in Supabase. Use Google or Solana, or re-enable Email under Authentication → Providers.";
  }
  if (lower.includes("web3") && lower.includes("disabled")) {
    return "Web3 provider is disabled. Enable it in Supabase → Authentication → Providers → Web3.";
  }
  if (
    lower.includes("no compatible solana wallet") ||
    lower.includes("window.solana") ||
    lower.includes("no solana wallet")
  ) {
    return "No Solana wallet detected. Install Phantom (or Solflare), unlock it on this browser, then try again.";
  }
  if (lower.includes("email_address_invalid")) {
    return "Use a real email address (not @example.com).";
  }
  return message;
}

function requireConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set URL + anon key in .env.local and restart npm run dev.",
    );
  }
}

/** Resolve Phantom / Brave / generic window.solana and connect if needed. */
export async function resolveSolanaWallet(): Promise<SolanaWalletProvider> {
  const wallet =
    window.solana ?? window.phantom?.solana ?? window.braveSolana;

  if (!wallet) {
    throw new Error(
      "No Solana wallet detected. Install Phantom (or Solflare), unlock it on this browser, then try again.",
    );
  }

  if (!wallet.publicKey && typeof wallet.connect === "function") {
    await wallet.connect();
  }

  return wallet;
}

export function extractSolanaAddress(user: User): string | null {
  const web3 = user.identities?.find(
    (i) => i.provider === "web3" || i.provider === "solana",
  );
  const data = web3?.identity_data as Record<string, unknown> | undefined;
  const fromIdentity =
    (typeof data?.address === "string" && data.address) ||
    (typeof data?.wallet_address === "string" && data.wallet_address) ||
    (typeof data?.sub === "string" && data.sub) ||
    (typeof web3?.id === "string" && web3.id) ||
    null;

  if (fromIdentity) return fromIdentity;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (typeof meta?.address === "string") return meta.address;
  if (typeof meta?.wallet_address === "string") return meta.wallet_address;

  return null;
}

export type ProvenSolanaWallet = {
  address: string;
  message: string;
  signature: string;
};

/**
 * Connect Phantom (etc.) and require signMessage — proves key ownership.
 * Does not write to the DB; caller must POST /api/profile/wallet.
 */
export async function proveSolanaWalletLink(): Promise<ProvenSolanaWallet> {
  const wallet = await resolveSolanaWallet();
  const address = wallet.publicKey?.toBase58();
  if (!address) {
    throw new Error("Wallet connected but address missing.");
  }
  if (typeof wallet.signMessage !== "function") {
    throw new Error(
      "This wallet cannot sign messages. Use Phantom or another wallet that supports signMessage.",
    );
  }

  const issuedAt = new Date().toISOString();
  const message = buildWalletLinkMessage(address, issuedAt);
  const encoded = new TextEncoder().encode(message);
  const raw = await wallet.signMessage(encoded, "utf8");
  const sigBytes = raw instanceof Uint8Array ? raw : raw.signature;
  if (!sigBytes?.length) {
    throw new Error("Wallet did not return a signature.");
  }

  return {
    address,
    message,
    signature: bytesToBase58(sigBytes),
  };
}

/** @deprecated Use proveSolanaWalletLink — connect alone does not prove ownership. */
export async function connectSolanaAddress(): Promise<string> {
  const proven = await proveSolanaWalletLink();
  return proven.address;
}

/** Persist Solana pubkey on user_profiles after Web3 login (auth-verified identity). */
export async function syncWalletAddressToProfile(
  supabase: SupabaseClient,
  user: User,
  _fallbackAddress?: string | null,
) {
  // Prefer RPC (works after column-level UPDATE revoke on wallet_address)
  const { error: rpcErr } = await supabase.rpc("sync_wallet_from_auth_identity");
  if (!rpcErr) return;

  // Pre-migration fallback
  const address = extractSolanaAddress(user) ?? _fallbackAddress ?? null;
  if (!address) return;
  await supabase
    .from("user_profiles")
    .update({ wallet_address: address, updated_at: new Date().toISOString() })
    .eq("id", user.id);
}

function oauthRedirectOrigin(): string {
  const origin = window.location.origin;
  try {
    const host = new URL(origin).hostname;
    if (
      host === "0.0.0.0" ||
      host === "::" ||
      host === "127.0.0.1" ||
      host === "localhost"
    ) {
      return "https://yieldsync.io";
    }
  } catch {
    return "https://yieldsync.io";
  }
  return origin;
}

export async function signInWithGoogle() {
  requireConfigured();
  const supabase = createClient();
  const next =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next")
      : null;
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${oauthRedirectOrigin()}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      // Stay on page until we verify the authorize URL works
      skipBrowserRedirect: true,
    },
  });
  if (error) throw new Error(mapAuthError(error.message));
  if (!data.url) throw new Error("Google sign-in did not return a redirect URL.");

  // Catch misconfigured Google (missing client secret) before leaving the app
  try {
    const probe = await fetch(data.url, { method: "GET", redirect: "manual" });
    if (probe.status >= 400) {
      let msg = `Google authorize failed (${probe.status})`;
      try {
        const body = (await probe.json()) as { msg?: string; message?: string };
        msg = body.msg || body.message || msg;
      } catch {
        /* ignore */
      }
      throw new Error(mapAuthError(msg));
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Google is not fully")) {
      throw err;
    }
    if (!(err instanceof TypeError) && err instanceof Error) {
      throw err;
    }
  }

  window.location.assign(data.url);
}

export async function signInWithSolana() {
  requireConfigured();
  const supabase = createClient();
  const wallet = await resolveSolanaWallet();
  const fallbackAddress = wallet.publicKey?.toBase58() ?? null;

  // Wallet Standard / Phantom shapes vary; SDK accepts compatible window wallets.
  const { data, error } = await supabase.auth.signInWithWeb3({
    chain: "solana",
    statement: SOLANA_STATEMENT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wallet: wallet as any,
  });

  if (error) throw new Error(mapAuthError(error.message));
  if (!data.session || !data.user) {
    throw new Error("Solana sign-in did not return a session.");
  }

  await syncWalletAddressToProfile(supabase, data.user, fallbackAddress);
  return data;
}
