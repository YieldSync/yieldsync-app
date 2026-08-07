import nacl from "tweetnacl";
import bs58 from "bs58";

/** Message the wallet must sign to prove ownership (bound to address + time window). */
export function buildWalletLinkMessage(address: string, issuedAtIso: string): string {
  return [
    "YieldSync profile wallet link",
    `Address: ${address}`,
    `Issued at: ${issuedAtIso}`,
    "Only sign this if you are linking this wallet to your YieldSync account.",
  ].join("\n");
}

export function bytesToBase58(bytes: Uint8Array): string {
  return bs58.encode(bytes);
}

export function verifySolanaMessageSignature(opts: {
  address: string;
  message: string;
  signatureBase58: string;
}): boolean {
  try {
    const messageBytes = new TextEncoder().encode(opts.message);
    const signature = bs58.decode(opts.signatureBase58);
    const publicKey = bs58.decode(opts.address);
    if (publicKey.length !== 32 || signature.length !== 64) return false;
    return nacl.sign.detached.verify(messageBytes, signature, publicKey);
  } catch {
    return false;
  }
}
