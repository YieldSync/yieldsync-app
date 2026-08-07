'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Wordmark } from '@/components/brand'
import { useCurrentUser } from '@/hooks/use-current-user'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Home', href: '#home', id: 'home' },
  { label: 'Features', href: '#features', id: 'features' },
  { label: 'How it works', href: '#how-it-works', id: 'how-it-works' },
  { label: 'Pricing', href: '#pricing', id: 'pricing' },
  { label: 'FAQ', href: '#faq', id: 'faq' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')
  const { user, loading } = useCurrentUser()
  const signedIn = Boolean(user)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const ids = NAV.map((n) => n.id)
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el)

    if (!els.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (!top?.target?.id) return
        const id = top.target.id
        setActive(id)
        const hash = `#${id}`
        if (window.location.hash !== hash) {
          window.history.replaceState(null, '', hash)
        }
      },
      {
        rootMargin: '-30% 0px -55% 0px',
        threshold: [0, 0.1, 0.25, 0.5],
      },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] w-full max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <a href="#home" aria-label="YieldSync home">
          <Wordmark />
        </a>

        <nav
          aria-label="Main"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex"
        >
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                'text-[15px] transition-colors',
                active === item.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && !signedIn ? (
            <Link
              href="/login"
              className="hidden text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
          ) : null}

          <Link
            href={signedIn ? '/dashboard' : '/login#signup'}
            className="hidden rounded-none bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground shadow-[0_0_30px_-6px_rgba(255,93,0,0.85)] transition-transform hover:scale-[1.03] sm:inline-flex"
          >
            {signedIn ? 'Dashboard' : 'Get Started'}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex size-10 items-center justify-center rounded-none border border-border text-foreground lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t border-border bg-background lg:hidden',
          open ? 'max-h-[28rem]' : 'max-h-0',
        )}
        style={{ transition: 'max-height 300ms ease' }}
      >
        <nav
          aria-label="Mobile"
          className="mx-auto flex w-full max-w-[1280px] flex-col px-5 py-4 sm:px-8"
        >
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'border-b border-border py-3.5 text-[15px] last:border-0',
                active === item.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </a>
          ))}

          {!loading && !signedIn ? (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-4 rounded-none border border-border px-4 py-3 text-center text-[14px] font-semibold"
            >
              Sign in
            </Link>
          ) : null}

          <Link
            href={signedIn ? '/dashboard' : '/login#signup'}
            onClick={() => setOpen(false)}
            className="mt-3 rounded-none bg-primary px-6 py-3 text-center text-[15px] font-semibold text-primary-foreground"
          >
            {signedIn ? 'Dashboard' : 'Get Started'}
          </Link>
        </nav>
      </div>
    </header>
  )
}
