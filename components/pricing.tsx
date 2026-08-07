import { ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionShell } from '@/components/brand'
import content from '@/text-content/pricing.json'

function Check() {
  return (
    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-primary">
      <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
        <path
          d="M2.5 6.3 4.6 8.4 9.5 3.5"
          fill="none"
          stroke="#fff"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function Pricing() {
  return (
    <SectionShell id="pricing">
      <div className="grid lg:grid-cols-[2fr_1fr]">
        <div className="px-5 pb-16 pt-20 sm:px-8 lg:border-r lg:border-border">
          <h2 className="max-w-[420px] text-balance text-[32px] font-bold leading-[1.12] tracking-[-0.025em] sm:text-[40px]">
            {content.title}
          </h2>
          <p className="mt-5 max-w-[430px] text-pretty text-[15px] leading-relaxed text-muted-foreground">
            {content.description}
          </p>
        </div>

        <div className="flex items-end">
          <a
            href="#pricing"
            className="flex w-full items-center justify-between border-t border-border px-5 py-5 text-[15px] font-medium transition-colors hover:bg-white/3 sm:px-8"
          >
            Get Started
            <ChevronsRight className="size-4 text-muted-foreground" />
          </a>
        </div>
      </div>

      <ul className="grid border-t border-border lg:grid-cols-3">
        {content.plans.map((plan) => {
          const popular = plan.badge === 'Most Popular'
          return (
            <li
              key={plan.name}
              className={cn(
                'flex flex-col border-b border-r border-border last:border-r-0',
                popular && 'bg-white/2',
              )}
            >
              <div className="border-b border-border px-6 py-7">
                <p className="text-[17px] font-semibold tracking-[-0.01em]">
                  {plan.name}
                </p>
                <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-muted-foreground">
                  {plan.target}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <span className="text-[30px] font-semibold tracking-[-0.02em]">
                    {plan.price}
                  </span>
                  {plan.badge ? (
                    <span
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-semibold',
                        popular
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-primary/40 bg-primary/12 text-primary',
                      )}
                    >
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                {'description' in plan && typeof (plan as { description?: string }).description === 'string' ? (
                  <p className="mt-4 max-w-[320px] text-[13px] leading-relaxed text-muted-foreground">
                    {(plan as { description?: string }).description}
                  </p>
                ) : null}
              </div>

              <ul className="flex flex-1 flex-col gap-3.5 border-b border-border px-6 py-7">
                {plan.features.map((feature, i) => (
                  <li
                    key={`${feature}-${i}`}
                    className="flex items-start gap-3 text-[14px] text-foreground/85"
                  >
                    <Check />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="p-6">
                <a
                  href="#home"
                  className={cn(
                    'flex h-11 items-center justify-center rounded-lg border text-[14px] font-semibold transition-transform hover:scale-[1.02]',
                    popular
                      ? 'border-primary bg-primary text-primary-foreground shadow-[var(--glow-button)]'
                      : 'border-border bg-secondary text-foreground',
                  )}
                >
                  {plan.cta}
                </a>
              </div>
            </li>
          )
        })}
      </ul>
    </SectionShell>
  )
}
