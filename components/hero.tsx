import { LiquidGradient } from '@/components/liquid-gradient'
import { DashboardMockup } from '@/components/dashboard-mockup'
import content from '@/text-content/hero.json'
import {
  LAUNCHING_SOON_BODY,
  LAUNCHING_SOON_TITLE,
  SIGNUPS_ENABLED,
} from '@/lib/product'
import { publicAppHref } from '@/lib/site'

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
        {/* Dark: soft black vignette · Light: white wash so fluid stays pale mint */}
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_20%,rgba(5,5,5,0.1)_0%,rgba(5,5,5,0.35)_100%)] light:bg-[radial-gradient(90%_70%_at_50%_20%,rgba(255,255,255,0.55)_0%,rgba(243,247,244,0.72)_100%)]" />
      </div>

      <div className="relative grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1280px)_minmax(0,1fr)]">
        <div aria-hidden className="bg-transparent" />

        <div className="min-w-0 border-x border-border">
          <div className="flex flex-col items-center px-5 pb-8 pt-[100px] text-center sm:px-8 sm:pb-10 sm:pt-[110px]">
            {!SIGNUPS_ENABLED ? (
              <p
                className="mc-rise mb-5 inline-flex items-center gap-2 border border-primary/35 bg-primary/10 px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.04em] text-primary uppercase"
                style={{ animationDelay: '40ms' }}
              >
                <span className="size-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
                {LAUNCHING_SOON_TITLE}
              </p>
            ) : null}

            <h1 className="mc-rise max-w-[760px] text-pretty text-[34px] font-bold leading-[1.08] tracking-[-0.025em] text-foreground sm:text-[46px] md:text-[54px]">
              {content.title}
            </h1>

            <p
              className="mc-rise mt-4 max-w-[520px] text-pretty text-[14px] leading-relaxed text-foreground/80 sm:text-[16px]"
              style={{ animationDelay: '120ms' }}
            >
              {content.description}
            </p>

            {!SIGNUPS_ENABLED ? (
              <p
                className="mc-rise mt-3 max-w-[440px] text-pretty text-[13px] leading-relaxed text-muted-foreground"
                style={{ animationDelay: '180ms' }}
              >
                {LAUNCHING_SOON_BODY}
              </p>
            ) : null}

            <div
              className="mc-rise mt-6 flex flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: '240ms' }}
            >
              {SIGNUPS_ENABLED ? (
                <a
                  href={publicAppHref('/login#signup')}
                  className="inline-flex rounded-none bg-primary px-7 py-3 text-[15px] font-semibold text-primary-foreground shadow-[var(--glow-button)] transition-transform hover:scale-[1.03]"
                >
                  Get Started
                </a>
              ) : (
                <>
                  <a
                    href={publicAppHref('/login')}
                    className="inline-flex rounded-none bg-primary px-7 py-3 text-[15px] font-semibold text-primary-foreground shadow-[var(--glow-button)] transition-transform hover:scale-[1.03]"
                  >
                    Sign in
                  </a>
                  <span className="inline-flex rounded-none border border-border bg-background/40 px-5 py-3 text-[14px] font-medium text-muted-foreground backdrop-blur-sm light:bg-white/70">
                    Public access · launching soon
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mc-bleed-t" aria-hidden />

          {/*
            Glass Kästen — lightly translucent so fluid shimmers through.
            Mockup itself stays fully solid on top.
          */}
          <div
            className="relative bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(90,40,10,0.06)_50%,rgba(20,10,4,0.08)_100%)] px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(255,255,255,0.03)] backdrop-blur-[28px] backdrop-saturate-150 sm:px-7 sm:py-8 lg:px-10 lg:py-10 light:bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(238,246,240,0.55)_100%)] light:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          >
            <div
              className="pointer-events-none absolute inset-0 light:hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 35%, transparent 70%, color-mix(in srgb, var(--primary) 8%, transparent) 100%)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 hidden light:block"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, transparent 40%, color-mix(in srgb, var(--primary) 6%, transparent) 100%)',
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
