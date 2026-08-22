import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  CreditCard,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export type SectionId =
  | "dashboard"
  | "activities"
  | "discover"
  | "tracking-wallets"
  | "strategies"
  | "trading-wallets"
  | "positions"
  | "plans"
  | "billing"
  | "settings"
  | "documentation"

export type NavItem = {
  id: SectionId
  title: string
  hash: string
  icon: LucideIcon
  group: string
  description: string
}

export const BASE_PATH = "/dashboard"

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    hash: "#dashboard",
    icon: BarChart3,
    group: "Overview",
    description: "Overview of wallet performance, sync activity and execution metrics.",
  },
  {
    id: "activities",
    title: "Activities",
    hash: "#activities",
    icon: Activity,
    group: "Overview",
    description: "Live transactions, token movements and alerts across tracked wallets.",
  },
  {
    id: "discover",
    title: "Discover",
    hash: "#discover",
    icon: Brain,
    group: "Sync Hub",
    description:
      "Discover and analyze profitable wallets based on performance, behavior and activity.",
  },
  {
    id: "tracking-wallets",
    title: "Tracking Wallets",
    hash: "#tracking-wallets",
    icon: RefreshCw,
    group: "Sync Hub",
    description: "Manage wallets that should be tracked and synchronized.",
  },
  {
    id: "strategies",
    title: "Strategies",
    hash: "#strategies",
    icon: SlidersHorizontal,
    group: "Sync Hub",
    description:
      "Create and manage synchronization rules that define how trades from tracked wallets are executed.",
  },
  {
    id: "trading-wallets",
    title: "Trading Wallets",
    hash: "#trading-wallets",
    icon: Wallet,
    group: "Sync Hub",
    description:
      "Create, fund and assign the trading wallets that execute your synchronized strategies.",
  },
  {
    id: "positions",
    title: "Positions",
    hash: "#positions",
    icon: Layers,
    group: "Sync Hub",
    description:
      "Open and historical LP positions from copy trading across tracking and trading wallets.",
  },
  {
    id: "plans",
    title: "Plans",
    hash: "#plans",
    icon: Sparkles,
    group: "Account",
    description: "Compare tiers and pick the plan that matches your wallet and strategy volume.",
  },
  {
    id: "billing",
    title: "Billing",
    hash: "#billing",
    icon: CreditCard,
    group: "Account",
    description: "Manage subscription plans and usage.",
  },
  {
    id: "settings",
    title: "Settings",
    hash: "#settings",
    icon: UserCog,
    group: "Account",
    description:
      "Profile, security, notifications and platform preferences in a single place.",
  },
  {
    id: "documentation",
    title: "Documentation",
    hash: "#documentation",
    icon: BookOpen,
    group: "Hidden",
    description: "Guides, API documentation and platform tutorials.",
  },
]

export const navGroups = ["Overview", "Sync Hub", "Account"] as const

const sectionIds = navItems.map((item) => item.id)

export function isSectionId(value: string): value is SectionId {
  return (sectionIds as string[]).includes(value)
}

/** Full href for a section. Dashboard stays at /dashboard; others are /discover etc. */
export function sectionHref(id: SectionId) {
  return id === "dashboard" ? BASE_PATH : `/${id}`
}

export function pathToSection(pathname: string): SectionId {
  const raw = pathname.replace(/\/+$/, "") || "/"
  if (raw === "/" || raw === BASE_PATH) return "dashboard"
  const first = raw.slice(1).split("/")[0] ?? ""
  return isSectionId(first) ? first : "dashboard"
}

export function isAppSectionPath(pathname: string): boolean {
  const raw = pathname.replace(/\/+$/, "") || "/"
  if (raw === BASE_PATH || raw.startsWith(`${BASE_PATH}/`)) return true
  if (raw.startsWith("/wallet/") || raw === "/wallet") return true
  const first = raw.slice(1).split("/")[0] ?? ""
  return isSectionId(first)
}

export function getSectionMeta(id: SectionId) {
  const item = navItems.find((entry) => entry.id === id) ?? navItems[0]
  return { title: item.title, description: item.description }
}
