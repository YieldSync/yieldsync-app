import Link from 'next/link'
import { LiquidGradient } from '@/components/liquid-gradient'
import { SectionShell } from '@/components/brand'
import content from '@/text-content/bottom.json'

/** Bottom CTA — Framer liquid settings + Launch App. */
export function Cta() {
  return (
    <SectionShell>
      <div className="relative overflow-hidden">
        <LiquidGradient
          className="absolute inset-0 min-h-[420px]"
          seed={579}
          speed={0.38}
          scale={0.91}
          amplitude={0.23}
          frequency={0.1}
          definition={7}
          bands={3.8}
          amount={0.2}
          grain={0.04}
        />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_65%_at_50%_45%,transparent_0%,rgba(5,5,5,0.35)_100%)]" />

        <div className="relative z-10 flex min-h-[420px] flex-col items-center justify-center gap-5 px-6 py-24 text-center sm:min-h-[480px] sm:py-28">
          <h2 className="max-w-3xl text-balance text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[44px] md:text-[52px]">
            {content.title}
          </h2>

          <p className="max-w-xl text-pretty text-[15px] leading-relaxed text-white/80 sm:text-[17px]">
            {content.description}
          </p>

          <Link
            href="#pricing"
            className="mt-3 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-[16px] font-semibold text-primary-foreground shadow-[0_10px_40px_-8px_rgba(47,107,255,0.9)] transition-transform hover:scale-[1.03]"
          >
            {content.cta}
          </Link>
        </div>
      </div>
    </SectionShell>
  )
}
