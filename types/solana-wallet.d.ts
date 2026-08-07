/** Minimal Phantom / Solana wallet window API used by signInWithWeb3 */
interface SolanaPublicKey {
  toBase58(): string;
}

interface SolanaWalletProvider {
  publicKey?: SolanaPublicKey | null;
  isConnected?: boolean;
  connect?: () => Promise<{ publicKey: SolanaPublicKey }>;
  signMessage?: (
    message: Uint8Array,
    display?: string,
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
  signIn?: (input?: Record<string, unknown>) => Promise<unknown>;
}

interface PhantomProvider {
  solana?: SolanaWalletProvider;
}

interface Window {
  solana?: SolanaWalletProvider;
  phantom?: PhantomProvider;
  braveSolana?: SolanaWalletProvider;
}
