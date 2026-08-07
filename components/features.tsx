import {
  Activity,
  Boxes,
  Fuel,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { SectionShell } from '@/components/brand'
import content from '@/text-content/features.json'

const ICONS = [KeyRound, Activity, Sparkles, Boxes, Fuel, ShieldCheck] as const

export function Features() {
  return (
    <SectionShell id="features">
      <div className="flex flex-col items-center px-5 pb-14 pt-24 text-center sm:px-8 sm:pt-28">
        <h2 className="max-w-[620px] text-balance text-[34px] font-bold leading-[1.12] tracking-[-0.025em] sm:text-[44px]">
          {content.title}
        </h2>
        <p className="mt-5 max-w-[560px] text-pretty text-[15px] leading-relaxed text-muted-foreground">
          {content.description}
        </p>
      </div>

      {/* Gray spacer field — Framer Zwischenbalken */}
      <div className="mc-bleed-t h-14 bg-surface sm:h-16" aria-hidden />

      <ul className="mc-bleed-t grid sm:grid-cols-2 lg:grid-cols-3">
        {content.features.map((feature, i) => {
          const Icon = ICONS[i] ?? Sparkles
          const smRight = i % 2 === 0
          const lgRight = i % 3 !== 2
          return (
            <li
              key={feature.title}
              className={
                'group border-b border-border p-8 transition-colors hover:bg-white/[0.03]' +
                (smRight ? ' sm:border-r' : '') +
                (lgRight ? ' lg:border-r' : ' lg:border-r-0')
              }
            >
              <span className="flex size-10 items-center justify-center rounded-lg border border-primary/35 bg-primary/12 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-14 text-[17px] font-semibold tracking-[-0.01em]">
                {feature.title}
              </h3>
              <p className="mt-2.5 max-w-[330px] text-[14px] leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </li>
          )
        })}
      </ul>
    </SectionShell>
  )
}
