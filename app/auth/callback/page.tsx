'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

/**
 * OAuth return URL — exchange the code in the browser so session cookies are
 * set client-side. Avoids nginx 502 "upstream sent too big header" when the
 * server route redirects with large Set-Cookie headers.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Completing sign-in…')

  useEffect(() => {
    let cancelled = false

    async function run() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const next = safeNext(params.get('next'))

      if (!code) {
        setMessage('Missing auth code — redirecting to login…')
        router.replace('/login?error=auth')
        return
      }

      if (!isSupabaseConfigured()) {
        setMessage('Auth is not configured.')
        router.replace('/login?error=config')
        return
      }

      try {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error) {
          setMessage(error.message)
          router.replace('/login?error=auth')
          return
        }
        setMessage('Signed in — opening dashboard…')
        router.replace(next)
        router.refresh()
      } catch (err) {
        if (cancelled) return
        setMessage(err instanceof Error ? err.message : 'Sign-in failed')
        router.replace('/login?error=auth')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
