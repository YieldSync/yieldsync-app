"use client"

import { useCallback } from "react"
import { usePrivy, useSigners } from "@privy-io/react-auth"
import { requirePrivySignerId } from "@/lib/privy/signer"
import {
  findPrivySolanaWalletId,
  getEmbeddedSolanaWallets,
  hasPrivySignerOnWallet,
  isDuplicateSignerError,
} from "@/lib/trading-wallets/privy"

export type EnabledCopyTradingWallet = {
  execution_wallet: string
  privy_wallet_id: string
}

/**
 * Grant YieldSync the Privy session signer when a strategy starts.
 * Idempotent: skips addSigners if the signer is already on the wallet.
 */
export function useEnableCopyTradingWallet() {
  const { user } = usePrivy()
  const { addSigners } = useSigners()

  return useCallback(
    async (
      executionWalletAddress: string,
    ): Promise<EnabledCopyTradingWallet> => {
      const address = executionWalletAddress.trim()
      if (!address) {
        throw new Error("Execution wallet address required")
      }

      const signerId = requirePrivySignerId()
      let linked = user?.linkedAccounts ?? null

      const isEmbedded = getEmbeddedSolanaWallets(linked).some(
        (w) => w.address.toLowerCase() === address.toLowerCase(),
      )
      if (!isEmbedded) {
        throw new Error(
          "Copy trading needs a Privy trading wallet. Create one under Trading wallets — external wallets cannot be signed by the backend.",
        )
      }

      if (!hasPrivySignerOnWallet(linked, address)) {
        try {
          const { user: afterSigners } = await addSigners({
            address,
            signers: [{ signerId, policyIds: [] }],
          })
          linked = afterSigners?.linkedAccounts ?? linked
        } catch (err) {
          if (!isDuplicateSignerError(err)) throw err
        }
      }

      const privyWalletId = findPrivySolanaWalletId(linked, address)
      if (!privyWalletId) {
        throw new Error(
          "Privy wallet id not found — embedded Solana wallet required.",
        )
      }

      return {
        execution_wallet: address,
        privy_wallet_id: privyWalletId,
      }
    },
    [addSigners, user?.linkedAccounts],
  )
}
