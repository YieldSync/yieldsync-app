"use client"

import { DashboardFrame } from "@/components/dashboard/dashboard-frame"
import { useSection } from "@/hooks/use-section"
import { OverviewSection } from "@/components/sections/overview-section"
import { ActivitiesSection } from "@/components/sections/activities-section"
import { WalletIntelSection } from "@/components/sections/wallet-intel-section"
import { SyncWalletsSection } from "@/components/sections/sync-wallets-section"
import { SyncStrategiesSection } from "@/components/sections/sync-strategies-section"
import { ManageWalletsSection } from "@/components/sections/manage-wallets-section"
import { PositionsSection } from "@/components/sections/positions-section"
import { PlansSection } from "@/components/sections/plans-section"
import { BillingSection } from "@/components/sections/billing-section"
import { SettingsSection } from "@/components/sections/settings-section"
import { DocumentationSection } from "@/components/sections/documentation-section"

export function AppShell() {
  const section = useSection()

  return (
    <DashboardFrame active={section}>
      {section === "dashboard" ? <OverviewSection /> : null}
      {section === "activities" ? <ActivitiesSection /> : null}
      {section === "discover" ? <WalletIntelSection /> : null}
      {section === "tracking-wallets" ? <SyncWalletsSection /> : null}
      {section === "strategies" ? <SyncStrategiesSection /> : null}
      {section === "trading-wallets" ? <ManageWalletsSection /> : null}
      {section === "positions" ? <PositionsSection /> : null}
      {section === "plans" ? <PlansSection /> : null}
      {section === "billing" ? <BillingSection /> : null}
      {section === "settings" ? <SettingsSection /> : null}
      {section === "documentation" ? <DocumentationSection /> : null}
    </DashboardFrame>
  )
}
