import { LiquidGradient } from '@/components/liquid-gradient'
import { DashboardMockup } from '@/components/dashboard-mockup'
import content from '@/text-content/hero.json'

export function Hero() {
  return (
    <section id="home" className="relative w-full overflow-hidden">
      {/* Fluid — Framer Liquid Gradient settings */}
      <div className="pointer-events-none absolute inset-0">
        <LiquidGradient
          className="absolute inset-0"
          seed={579}
          speed={0.38}
          scale={0.91}
          amplitude={0.23}
          frequency={0.1}
          definition={7}
          bands={3.8}
          amount={0.2}
          grain={0.032}
        />
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_20%,rgba(5,5,5,0.1)_0%,rgba(5,5,5,0.35)_100%)]" />
      </div>

      <div className="relative grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1280px)_minmax(0,1fr)]">
        <div aria-hidden className="bg-transparent" />

        <div className="min-w-0 border-x border-border">
          <div className="flex flex-col items-center px-5 pb-8 pt-[100px] text-center sm:px-8 sm:pb-10 sm:pt-[110px]">
            <h1 className="mc-rise max-w-[760px] text-pretty text-[34px] font-bold leading-[1.08] tracking-[-0.025em] text-foreground sm:text-[46px] md:text-[54px]">
              {content.title}
            </h1>

            <p
              className="mc-rise mt-4 max-w-[520px] text-pretty text-[14px] leading-relaxed text-foreground/80 sm:text-[16px]"
              style={{ animationDelay: '120ms' }}
            >
              {content.description}
            </p>

            <a
              href="/login#signup"
              className="mc-rise mt-6 inline-flex rounded-none bg-primary px-7 py-3 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_40px_-8px_rgba(255,93,0,0.9)] transition-transform hover:scale-[1.03]"
              style={{ animationDelay: '240ms' }}
            >
              Get Started
            </a>
          </div>

          <div className="mc-bleed-t" aria-hidden />

          {/*
            Glass Kästen — lightly translucent so fluid shimmers through.
            Mockup itself stays fully solid on top.
          */}
          <div
            className="relative px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(90,40,10,0.06) 50%, rgba(20,10,4,0.08) 100%)',
              backdropFilter: 'blur(28px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 35%, transparent 70%, rgba(255,93,0,0.06) 100%)',
              }}
            />

            <div className="relative z-10">
              <DashboardMockup />
            </div>
          </div>
        </div>

        <div aria-hidden className="bg-transparent" />
      </div>
    </section>
  )
}
