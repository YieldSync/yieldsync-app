"use client"

import { useState, type ReactNode } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import type { SectionId } from "@/lib/navigation"

/**
 * Sidebar + header chrome shared by the dashboard and every standalone page
 * that should feel like part of it (wallet detail, for example).
 */
export function DashboardFrame({
  active,
  children,
}: {
  active: SectionId
  children: ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh">
      <div className="sticky top-0 hidden h-svh w-64 shrink-0 lg:block">
        <Sidebar active={active} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar active={active} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
