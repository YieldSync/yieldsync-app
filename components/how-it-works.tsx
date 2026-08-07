'use client'

import { useState } from 'react'
import { ChevronsRight } from 'lucide-react'
import { LiquidGradient } from '@/components/liquid-gradient'
import { SectionShell } from '@/components/brand'
import { cn } from '@/lib/utils'
import content from '@/text-content/how-it-works.json'

const GLYPHS = [
  'M4 12h16M4 7h16M4 17h16',
  'M12 3l8 5-8 5-8-5 8-5Zm0 13 8-5v6l-8 5-8-5v-6l8 5Z',
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v10',
  '',
  'M6 5h12l-6 7 6 7H6l6-7-6-7Z',
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9h8',
  'M5 9c4-5 10-5 14 0M5 15c4 5 10 5 14 0',
  'M7 8h10l-3 4h-7l3 4H7',
  'M4 10h16M4 14h16M9 6l-3 12M18 6l-3 12',
  'M12 4l7 4v8l-7 4-7-4V8l7-4Z',
  'M5 12a7 7 0 0 1 14 0 7 7 0 0 1-14 0Zm3 0h8',
  '',
  'M7 6l10 12M17 6L7 18',
  'M9 5h6l3 7-6 7-6-7 3-7Z',
  'M4 16c5 0 5-8 10-8s5 8 6 8',
  'M8 7h8l-4 5 4 5H8l4-5-4-5Z',
  'M12 3v18M5 8l7-5 7 5v8l-7 5-7-5V8Z',
  'M6 12h12M9 8l-3 4 3 4M15 8l3 4-3 4',
  'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z',
  '',
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
            href="/login#signup"
            className="flex h-14 w-full shrink-0 items-center justify-between border-t border-border px-5 text-[15px] font-medium text-foreground transition-colors hover:bg-white/3 sm:px-6"
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
                    ? 'border-l-2 border-l-primary bg-white/2'
                    : 'border-l-2 border-l-transparent hover:bg-white/1',
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

        {/* Bottom-right: liquid */}
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
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="grid grid-cols-5 gap-2 rounded-2xl border border-white/20 bg-white/8 p-3 backdrop-blur-md">
              {GLYPHS.map((d, i) => (
                <span
                  key={i}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg border border-white/12 bg-black/35',
                    !d && 'bg-black/20',
                  )}
                  style={{
                    animation: `mc-float ${3 + (i % 5) * 0.45}s ease-in-out ${
                      (i % 7) * 0.22
                    }s infinite`,
                  }}
                >
                  {d ? (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="size-4"
                    >
                      <path
                        d={d}
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
