'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { SupabaseAuthProvider } from '@/components/supabase-auth-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SupabaseAuthProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </SupabaseAuthProvider>
    </ThemeProvider>
  )
}
