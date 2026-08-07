'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { SectionShell } from '@/components/brand'
import content from '@/text-content/faq.json'

export function Faq() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <SectionShell id="faq">
      <div className="flex flex-col items-center px-5 pb-16 pt-24 text-center sm:px-8 sm:pb-20 sm:pt-28">
        <h2 className="max-w-[520px] text-balance text-[34px] font-bold leading-[1.12] tracking-[-0.025em] sm:text-[44px]">
          {content.title}
        </h2>
        <p className="mt-5 max-w-[460px] text-pretty text-[15px] leading-relaxed text-muted-foreground">
          {content.description}
        </p>
      </div>

      <ul>
        {content.faqs.map((item, i) => (
          <li key={item.question} className="border-t border-border">
            <h3>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="flex w-full items-center justify-between gap-6 px-5 py-3.5 text-left transition-colors hover:bg-white/2 sm:px-8"
              >
                <span className="text-[15px] font-medium tracking-[-0.01em]">
                  {item.question}
                </span>
                {open === i ? (
                  <Minus className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Plus className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            </h3>
            <div
              className="grid overflow-hidden px-5 sm:px-8"
              style={{
                gridTemplateRows: open === i ? '1fr' : '0fr',
                transition: 'grid-template-rows 300ms ease',
              }}
            >
              <p className="overflow-hidden text-[14px] leading-relaxed text-muted-foreground">
                <span className="block max-w-3xl pb-4 pr-8">{item.answer}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  )
}
