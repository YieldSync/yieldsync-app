"use client"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useSection } from "@/hooks/use-section"
import { OverviewSection } from "@/components/sections/overview-section"
import { ActivitiesSection } from "@/components/sections/activities-section"
import { WalletIntelSection } from "@/components/sections/wallet-intel-section"
import { SyncWalletsSection } from "@/components/sections/sync-wallets-section"
import { SyncStrategiesSection } from "@/components/sections/sync-strategies-section"
import { ManageWalletsSection } from "@/components/sections/manage-wallets-section"
import { PlansSection } from "@/components/sections/plans-section"
import { BillingSection } from "@/components/sections/billing-section"
import { SettingsSection } from "@/components/sections/settings-section"
import { DocumentationSection } from "@/components/sections/documentation-section"

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const section = useSection()

  return (
    <div className="flex min-h-svh">
      <div className="sticky top-0 hidden h-svh w-64 shrink-0 lg:block">
        <Sidebar active={section} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar active={section} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            {section === "dashboard" ? <OverviewSection /> : null}
            {section === "activities" ? <ActivitiesSection /> : null}
            {section === "discover" ? <WalletIntelSection /> : null}
            {section === "tracking-wallets" ? <SyncWalletsSection /> : null}
            {section === "strategies" ? <SyncStrategiesSection /> : null}
            {section === "trading-wallets" ? <ManageWalletsSection /> : null}
            {section === "plans" ? <PlansSection /> : null}
            {section === "billing" ? <BillingSection /> : null}
            {section === "settings" ? <SettingsSection /> : null}
            {section === "documentation" ? <DocumentationSection /> : null}
          </div>
        </main>
      </div>
    </div>
  )
}
