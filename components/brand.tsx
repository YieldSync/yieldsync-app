import Image from 'next/image'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/icon.svg"
      alt=""
      width={28}
      height={28}
      className={cn('h-6 w-6 shrink-0 rounded-[6px] object-contain', className)}
      priority
    />
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">
        YieldSync
      </span>
    </span>
  )
}

/**
 * Layout matching https://swift-look-251540.framer.app
 *
 * - Horizontal rules: FULL VIEWPORT (border on the section)
 * - Vertical rules: edges of the 1280px center column
 * - Outside center: page black
 * - Inside center: gray (--surface)
 */
export function SectionShell({
  children,
  className,
  id,
  clear = false,
}: {
  children: React.ReactNode
  className?: string
  id?: string
  clear?: boolean
}) {
  return (
    <section
      id={id}
      className={cn('relative w-full border-t border-border', className)}
    >
      {/*
        Full-width 3-col: black | gray center (max 1280) | black
        Horizontal line above already spans 100vw via section border-t.
      */}
      <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1280px)_minmax(0,1fr)]">
        <div className="bg-background" aria-hidden />
        <div
          className={cn(
            'min-w-0 border-x border-border',
            clear ? 'bg-transparent' : 'bg-surface',
          )}
        >
          {children}
        </div>
        <div className="bg-background" aria-hidden />
      </div>
    </section>
  )
}

/** Gray Zwischenbalken — full-bleed top rule, gray center band. */
export function SectionSpacer({ className }: { className?: string }) {
  return (
    <section
      className={cn('relative w-full border-t border-border', className)}
      aria-hidden
    >
      <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1280px)_minmax(0,1fr)]">
        <div className="bg-background" />
        <div className="h-14 border-x border-border bg-surface sm:h-16" />
        <div className="bg-background" />
      </div>
    </section>
  )
}
