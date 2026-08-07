export type NotificationTone = "critical" | "warning" | "success" | "info"

export type NotificationItem = {
  id: string
  tone: NotificationTone
  title: string
  body: string
  time: string
}

export const notificationFeed: NotificationItem[] = [
  {
    id: "n1",
    tone: "critical",
    title: "Degen Rotator sync paused",
    body: "Wallet health dropped to 41%. Mirroring stopped automatically.",
    time: "4m ago",
  },
  {
    id: "n2",
    tone: "success",
    title: "Execution landed",
    body: "TW Main bought 12.4 SOL of $WIF at 0.38% slippage.",
    time: "18m ago",
  },
  {
    id: "n3",
    tone: "warning",
    title: "Drawdown at 82% of budget",
    body: "Momentum Mirror is approaching its configured drawdown limit.",
    time: "1h ago",
  },
  {
    id: "n4",
    tone: "info",
    title: "New wallet matched your filters",
    body: "7cQ2…8mVe posted a 214% 30d PnL with a 68% win rate.",
    time: "3h ago",
  },
]
