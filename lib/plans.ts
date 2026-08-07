export type PlanTier = "Starter" | "Professional" | "Scale"

export type Plan = {
  name: PlanTier
  price: number
  audience: string
  cta: string
  popular?: boolean
  features: string[]
  limits: { syncWallets: number; strategies: number; tradingWallets: number }
}

export const plans: Plan[] = [
  {
    name: "Starter",
    price: 0,
    audience: "Users exploring LP strategies and testing YieldSync",
    cta: "Start Now",
    features: [
      "Track up to 5 wallets",
      "1 active copy strategy",
      "Limited strategy settings",
      "Basic wallet tracking",
    ],
    limits: { syncWallets: 5, strategies: 1, tradingWallets: 1 },
  },
  {
    name: "Professional",
    price: 29,
    audience: "Active LP providers managing automated strategies",
    cta: "Get Started",
    popular: true,
    features: [
      "Track up to 20 wallets",
      "Automated copy trading",
      "Telegram alerts with visuals",
      "One-click copy from alerts",
      "Advanced strategy settings",
      "Multiple copy strategies",
      "Up to 5 dedicated strategy wallets",
      "Private Pro community",
    ],
    limits: { syncWallets: 20, strategies: 10, tradingWallets: 5 },
  },
  {
    name: "Scale",
    price: 99,
    audience: "Power users running multiple strategies across more wallets",
    cta: "Scale Up",
    features: [
      "Track up to 50 wallets",
      "Automated copy trading",
      "Telegram alerts with visuals",
      "One-click copy from alerts",
      "Advanced strategy settings",
      "Multiple copy strategies",
      "Up to 20 dedicated strategy wallets",
      "Private Pro community",
    ],
    limits: { syncWallets: 50, strategies: 40, tradingWallets: 20 },
  },
]

export const currentPlanName: PlanTier = "Professional"

export const currentPlan = plans.find((plan) => plan.name === currentPlanName)!

export const account = {
  name: "rainer winkler",
  email: "db2022@mailbox.org",
  initials: "RW",
  plan: currentPlanName,
}

export const planComparison = [
  { label: "Tracked wallets", values: ["5", "20", "50"] },
  { label: "Copy strategies", values: ["1", "10", "40"] },
  { label: "Dedicated trading wallets", values: ["1", "5", "20"] },
  { label: "Automated copy trading", values: [false, true, true] },
  { label: "Telegram alerts with visuals", values: [false, true, true] },
  { label: "One-click copy from alerts", values: [false, true, true] },
  { label: "Advanced strategy settings", values: [false, true, true] },
  { label: "Priority execution routing", values: [false, false, true] },
  { label: "Private Pro community", values: [false, true, true] },
]
