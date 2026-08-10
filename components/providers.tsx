'use client'

import { useEffect, useState } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { ThemeProvider } from '@/components/theme-provider'
import {
  SupabaseAuthProvider,
  useSupabaseAuth,
} from '@/components/supabase-auth-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SOLANA_EXTERNAL_WALLET_LIST } from '@/lib/trading-wallets/privy'

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''

/**
 * Privy + Supabase JWT (customAuth).
 * Mount only after client hydration — Privy throws during SSR.
 */
function PrivyTree({ children }: { children: React.ReactNode }) {
  const { loading, supabase } = useSupabaseAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!appId || !mounted) return <>{children}</>

  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return <>{children}</>
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#7C9A6E',
          walletChainType: 'solana-only',
          walletList: [...SOLANA_EXTERNAL_WALLET_LIST],
        },
        loginMethods: ['email'],
        customAuth: {
          isLoading: loading,
          getCustomAccessToken: async () => {
            if (!supabase) return undefined
            const { data, error } = await supabase.auth.getSession()
            if (error) {
              console.error('[Privy customAuth] getSession', error.message)
              return undefined
            }
            return data.session?.access_token
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'off',
          },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SupabaseAuthProvider>
        <PrivyTree>
          <TooltipProvider>{children}</TooltipProvider>
        </PrivyTree>
      </SupabaseAuthProvider>
    </ThemeProvider>
  )
}
