'use client'

import { useState } from 'react'
import {
  ChevronsRight,
  LayoutGrid,
  MessageCircle,
  Repeat,
  Settings,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { LiquidGradient } from '@/components/liquid-gradient'
import { SectionShell } from '@/components/brand'
import { cn } from '@/lib/utils'
import { publicAppHref } from '@/lib/site'
import content from '@/text-content/how-it-works.json'

/** Dashboard mockup icons — reused in the how-it-works mosaic */
const DASH_ICONS: (LucideIcon | null)[] = [
  LayoutGrid,
  Wallet,
  Repeat,
  TrendingUp,
  MessageCircle,
  Settings,
  LayoutGrid,
  Wallet,
  null,
  Repeat,
  TrendingUp,
  MessageCircle,
  Settings,
  LayoutGrid,
  Wallet,
  null,
  Repeat,
  TrendingUp,
  MessageCircle,
  null,
]

export function HowItWorks() {
  const [active, setActive] = useState(0)

  return (
    <SectionShell id="how-it-works">
      <div className="grid lg:grid-cols-2">
        {/* Top-left: heading */}
        <div className="border-b border-border px-5 pb-14 pt-20 sm:px-8 lg:border-r">
          <h2 className="max-w-[420px] text-balance text-[32px] font-bold leading-[1.12] tracking-[-0.025em] sm:text-[40px]">
            {content.title}
          </h2>
          <p className="mt-5 max-w-[430px] text-pretty text-[15px] leading-relaxed text-muted-foreground">
            {content.description}
          </p>
        </div>

        {/* Top-right: compact Get Started bar, bottom-aligned (not full cell height) */}
        <div className="flex items-end border-b border-border">
          <a
            href={publicAppHref('/login#signup')}
            className="flex h-14 w-full shrink-0 items-center justify-between border-t border-border px-5 text-[15px] font-medium text-foreground transition-colors hover:bg-white/3 light:hover:bg-black/[0.03] sm:px-6"
          >
            Get Started
            <ChevronsRight className="size-4 text-muted-foreground" />
          </a>
        </div>

        {/* Bottom-left: steps */}
        <ul className="border-border lg:border-r">
          {content.steps.map((step, i) => (
            <li key={step.number}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={active === i}
                className={cn(
                  'w-full border-b border-border px-5 py-8 text-left transition-colors sm:px-8',
                  active === i
                    ? 'border-l-2 border-l-primary bg-white/2 light:bg-black/[0.03]'
                    : 'border-l-2 border-l-transparent hover:bg-white/1 light:hover:bg-black/[0.02]',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md text-[13px] font-semibold',
                    active === i
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-primary/30 bg-primary/12 text-primary',
                  )}
                >
                  {step.number}
                </span>
                <h3 className="mt-8 text-[17px] font-semibold tracking-[-0.01em]">
                  {step.title}
                </h3>
                <p className="mt-2.5 max-w-[560px] text-[14px] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {/* Bottom-right: liquid + dashboard icons */}
        <div className="relative min-h-[420px] overflow-hidden border-b border-border lg:min-h-0">
          <LiquidGradient
            seed={820}
            speed={0.38}
            scale={0.91}
            amplitude={0.23}
            frequency={0.1}
            definition={7}
            bands={3.8}
            amount={0.2}
          />
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_50%,transparent_0%,rgba(5,5,5,0.25)_100%)] light:bg-[radial-gradient(70%_60%_at_50%_50%,rgba(255,255,255,0.25)_0%,rgba(243,247,244,0.55)_100%)]" />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="grid grid-cols-5 gap-2 rounded-2xl border border-white/20 bg-white/8 p-3 backdrop-blur-md light:border-black/10 light:bg-white/70">
              {DASH_ICONS.map((Icon, i) => (
                <span
                  key={i}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg border border-white/12 bg-black/35 text-white/90 light:border-black/8 light:bg-white light:text-foreground/80',
                    !Icon && 'bg-black/20 light:bg-black/[0.04]',
                  )}
                  style={{
                    animation: `mc-float ${3 + (i % 5) * 0.45}s ease-in-out ${
                      (i % 7) * 0.22
                    }s infinite`,
                  }}
                >
                  {Icon ? <Icon className="size-4" strokeWidth={1.75} /> : null}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
