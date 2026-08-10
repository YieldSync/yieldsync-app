/**
 * Privy key-quorum ID for server/TEE signing (additional_signers.signer_id).
 * Must be a cuid2 from the Privy Dashboard → Authorization keys / Key quorums
 * (e.g. `tb54eps4z44ed0jepousxi4n`) — NEVER the `wallet-auth:…` private key.
 */

const CUID2_RE = /^[a-z][a-z0-9]{20,36}$/;

export function isPrivyKeyQuorumId(value: string): boolean {
  return CUID2_RE.test(value.trim());
}

/** Key-quorum ID (authorization key public id) — never the private key. */
export function getPrivySignerId(): string | null {
  const id = process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID?.trim();
  if (!id) return null;
  // Guard: misconfigured env often contains wallet-auth:<pkcs8> private key material
  if (id.startsWith("wallet-auth:") || id.includes("PRIVATE") || id.length > 64) {
    console.error(
      "[privy] NEXT_PUBLIC_PRIVY_SIGNER_ID looks like a private key, not a key-quorum cuid2. Ignoring.",
    );
    return null;
  }
  if (!isPrivyKeyQuorumId(id)) {
    console.error(
      "[privy] NEXT_PUBLIC_PRIVY_SIGNER_ID is not a valid cuid2 key-quorum id:",
      id.slice(0, 24),
    );
    return null;
  }
  return id;
}

/** Privy createWallet / addSigners payload, or undefined if not configured. */
export function privySignerInputs():
  | { signerId: string; policyIds: string[] }[]
  | undefined {
  const signerId = getPrivySignerId();
  if (!signerId) return undefined;
  return [{ signerId, policyIds: [] }];
}

export function requirePrivySignerId(): string {
  const id = getPrivySignerId();
  if (!id) {
    throw new Error(
      "Copy trading is not ready yet. Please try again in a moment.",
    );
  }
  return id;
}
