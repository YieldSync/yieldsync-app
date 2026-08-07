import { Wordmark } from '@/components/brand'

/** Slim Framer-style footer: logo left, copyright right. */
export function SiteFooter() {
  return (
    <footer className="relative w-full border-t border-border bg-background">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1280px)_minmax(0,1fr)]">
        <div aria-hidden />
        <div className="flex items-center justify-between gap-4 border-x border-border px-5 py-5 sm:px-8 sm:py-6">
          <Wordmark />
          <p className="text-[12px] text-muted-foreground sm:text-[13px]">
            ©{new Date().getFullYear()} YieldSync
          </p>
        </div>
        <div aria-hidden />
      </div>
    </footer>
  )
}
