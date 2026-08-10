export type LinkedSolanaWallet = {
  address: string;
  /** Privy wallet id (for server signing), when present on linkedAccounts. */
  id?: string;
  /** True when a session/authorization signer is already on the wallet. */
  delegated?: boolean;
  imported?: boolean;
  /** e.g. privy, phantom, solflare — embedded when privy / privy-v2 */
  walletClientType?: string;
  embedded: boolean;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function isEmbeddedClient(walletClientType: unknown): boolean {
  return (
    walletClientType == null ||
    walletClientType === "privy" ||
    walletClientType === "privy-v2"
  );
}

/** All linked Solana wallets (embedded + external e.g. Phantom). */
export function getLinkedSolanaWallets(
  linkedAccounts: unknown,
): LinkedSolanaWallet[] {
  if (!Array.isArray(linkedAccounts)) return [];
  const out: LinkedSolanaWallet[] = [];
  const seen = new Set<string>();
  for (const account of linkedAccounts) {
    const row = asRecord(account);
    if (!row) continue;
    if (row.type !== "wallet" && row.type !== "smart_wallet") continue;
    if (row.chainType && row.chainType !== "solana") continue;
    const address = typeof row.address === "string" ? row.address : null;
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const walletClientType =
      typeof row.walletClientType === "string" ? row.walletClientType : undefined;
    const id = typeof row.id === "string" && row.id ? row.id : undefined;
    out.push({
      address,
      id,
      delegated: row.delegated === true,
      imported: row.imported === true,
      walletClientType,
      embedded: isEmbeddedClient(walletClientType),
    });
  }
  return out;
}

/** Privy embedded Solana wallets only (server-signable). */
export function getEmbeddedSolanaWallets(
  linkedAccounts: unknown,
): LinkedSolanaWallet[] {
  return getLinkedSolanaWallets(linkedAccounts).filter((w) => w.embedded);
}

/** Resolve Privy wallet id for a Solana address from linkedAccounts. */
export function findPrivySolanaWalletId(
  linkedAccounts: unknown,
  address: string,
): string | null {
  const target = address.trim().toLowerCase();
  if (!target) return null;
  const match = getEmbeddedSolanaWallets(linkedAccounts).find(
    (w) => w.address.toLowerCase() === target,
  );
  return match?.id ?? null;
}

/** True if our authorization signer is already on this wallet (skip addSigners). */
export function hasPrivySignerOnWallet(
  linkedAccounts: unknown,
  address: string,
): boolean {
  const target = address.trim().toLowerCase();
  if (!target) return false;
  const match = getEmbeddedSolanaWallets(linkedAccounts).find(
    (w) => w.address.toLowerCase() === target,
  );
  // Privy sets delegated=true once any signer is attached
  return Boolean(match?.delegated && match?.id);
}

export function isDuplicateSignerError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : String(err ?? "");
  return /duplicate signer/i.test(msg);
}

export function walletAddressFromCreateResult(created: unknown): string | null {
  if (!created || typeof created !== "object") return null;
  const row = created as Record<string, unknown>;
  if (typeof row.address === "string" && row.address) return row.address;
  const wallet = row.wallet;
  if (wallet && typeof wallet === "object") {
    const addr = (wallet as Record<string, unknown>).address;
    if (typeof addr === "string" && addr) return addr;
  }
  return null;
}

/** Prefer wallet.id from createWallet result when available. */
export function privyWalletIdFromCreateResult(created: unknown): string | null {
  if (!created || typeof created !== "object") return null;
  const row = created as Record<string, unknown>;
  if (typeof row.id === "string" && row.id) return row.id;
  const wallet = row.wallet;
  if (wallet && typeof wallet === "object") {
    const id = (wallet as Record<string, unknown>).id;
    if (typeof id === "string" && id) return id;
  }
  return null;
}

/** Solana external wallets shown in Privy connect / link modal. */
export const SOLANA_EXTERNAL_WALLET_LIST = [
  "phantom",
  "solflare",
  "backpack",
  "jupiter",
  "detected_solana_wallets",
  "wallet_connect_qr_solana",
] as const;
