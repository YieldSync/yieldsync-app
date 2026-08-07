export type WalletCategory = "Whale" | "Smart Money" | "Trader" | "Investor" | "Bot"
export type RiskLevel = "Low" | "Medium" | "High"
export type SyncStatus = "Synced" | "Syncing" | "Paused" | "Error"

export type IntelWallet = {
  address: string
  label: string
  category: WalletCategory
  score: number
  winRate: number
  pnl7d: number
  totalProfit: number
  lastActivity: string
  risk: RiskLevel
}

export type SyncWallet = {
  address: string
  label: string
  category: WalletCategory
  score: number
  pnl7d: number
  health: number
  lastActivity: string
  status: SyncStatus
  copiedTrades: number
  strategy: string
}

export type Strategy = {
  id: string
  name: string
  wallets: number
  positionSize: string
  mode: "Instant" | "Delayed" | "Manual"
  pnl: number
  pnlPct: number
  winRate: number
  status: "Active" | "Paused" | "Draft"
}

export type ActivityRow = {
  time: string
  wallet: string
  address: string
  action: "Buy" | "Sell" | "Add Liquidity" | "Remove Liquidity"
  token: string
  pair: string
  amount: number
  status: "Executed" | "Skipped" | "Failed" | "Pending"
}

export const stats = {
  syncedWallets: { value: "14", of: "of 25 seats", delta: 12.45 },
  activeStrategies: { value: "6", of: "of 10 slots", delta: 8.1 },
  executionVolume: { value: "$128,430.29", of: "last 30 days", delta: 15.2 },
  performance7d: { value: "+$18,392.75", of: "net realized + open", delta: 6.34 },
}

export const performanceSeries = [
  { date: "May 04", total: 1200, realized: 800, unrealized: 400 },
  { date: "May 06", total: 2100, realized: 1400, unrealized: 700 },
  { date: "May 08", total: 1850, realized: 1500, unrealized: 350 },
  { date: "May 10", total: 3400, realized: 2200, unrealized: 1200 },
  { date: "May 12", total: 4200, realized: 2900, unrealized: 1300 },
  { date: "May 14", total: 3900, realized: 3100, unrealized: 800 },
  { date: "May 16", total: 5600, realized: 3800, unrealized: 1800 },
  { date: "May 18", total: 7100, realized: 4600, unrealized: 2500 },
  { date: "May 20", total: 6800, realized: 5100, unrealized: 1700 },
  { date: "May 22", total: 8900, realized: 6000, unrealized: 2900 },
  { date: "May 24", total: 10400, realized: 7200, unrealized: 3200 },
  { date: "May 26", total: 9800, realized: 7800, unrealized: 2000 },
  { date: "May 28", total: 12600, realized: 8900, unrealized: 3700 },
  { date: "May 30", total: 14900, realized: 10200, unrealized: 4700 },
  { date: "Jun 01", total: 16200, realized: 11400, unrealized: 4800 },
  { date: "Jun 03", total: 17500, realized: 12100, unrealized: 5400 },
  { date: "Jun 05", total: 18392, realized: 12843, unrealized: 5549 },
]

export const activitySeries = [
  { hour: "00", executions: 12, signals: 28 },
  { hour: "03", executions: 8, signals: 19 },
  { hour: "06", executions: 21, signals: 44 },
  { hour: "09", executions: 34, signals: 61 },
  { hour: "12", executions: 48, signals: 83 },
  { hour: "15", executions: 39, signals: 70 },
  { hour: "18", executions: 55, signals: 96 },
  { hour: "21", executions: 27, signals: 52 },
]

export const strategyPerformance = [
  { name: "Momentum", pnl: 6321 },
  { name: "Sniper", pnl: 2890 },
  { name: "Mean Rev.", pnl: 4180 },
  { name: "LP Rotate", pnl: 1720 },
  { name: "Blue Chip", pnl: 3280 },
]

export const recentActivity: ActivityRow[] = [
  {
    time: "2m ago",
    wallet: "TW Main",
    address: "6xF...3mJ8",
    action: "Buy",
    token: "DOOM",
    pair: "DOOM / SOL",
    amount: 3.0,
    status: "Executed",
  },
  {
    time: "5m ago",
    wallet: "TW Growth",
    address: "9kL...7dJ2",
    action: "Buy",
    token: "NEEGY",
    pair: "NEEGY / SOL",
    amount: 1.3475,
    status: "Skipped",
  },
  {
    time: "12m ago",
    wallet: "TW Main",
    address: "6xF...3mJ8",
    action: "Add Liquidity",
    token: "ONLYM",
    pair: "ONLYM / SOL",
    amount: 3.0,
    status: "Executed",
  },
  {
    time: "18m ago",
    wallet: "TW Main",
    address: "6xF...3mJ8",
    action: "Buy",
    token: "POPCAT",
    pair: "POPCAT / SOL",
    amount: 2.25,
    status: "Failed",
  },
  {
    time: "25m ago",
    wallet: "TW Growth",
    address: "9kL...7dJ2",
    action: "Sell",
    token: "WIF",
    pair: "WIF / SOL",
    amount: -1.12,
    status: "Executed",
  },
  {
    time: "34m ago",
    wallet: "TW Alpha",
    address: "3aQ...8kR1",
    action: "Remove Liquidity",
    token: "JUP",
    pair: "JUP / SOL",
    amount: -0.84,
    status: "Pending",
  },
  {
    time: "51m ago",
    wallet: "TW Alpha",
    address: "3aQ...8kR1",
    action: "Buy",
    token: "PYTH",
    pair: "PYTH / SOL",
    amount: 5.5,
    status: "Executed",
  },
]

export const intelWallets: IntelWallet[] = [
  {
    address: "7xPqK4mN8vR2tYuI9oL3aS6dF1gH5jK2b",
    label: "Solana OG",
    category: "Whale",
    score: 96,
    winRate: 74.2,
    pnl7d: 42310.55,
    totalProfit: 1284300.1,
    lastActivity: "2m ago",
    risk: "Low",
  },
  {
    address: "9kLmN2pQ7rS4tU8vW1xY6zA3bC5dE9fG",
    label: "Momentum Desk",
    category: "Smart Money",
    score: 91,
    winRate: 68.4,
    pnl7d: 18392.75,
    totalProfit: 642180.44,
    lastActivity: "6m ago",
    risk: "Low",
  },
  {
    address: "4tRvB8nM3kL9pQ2wE7yU1iO6aS4dF8gH",
    label: "Sniper 04",
    category: "Bot",
    score: 88,
    winRate: 61.1,
    pnl7d: 9840.2,
    totalProfit: 288400.9,
    lastActivity: "just now",
    risk: "High",
  },
  {
    address: "2aS5dF8gH1jK4lZ7xC9vB3nM6qW2eR5t",
    label: "Quiet Accumulator",
    category: "Investor",
    score: 84,
    winRate: 71.8,
    pnl7d: 6120.0,
    totalProfit: 402900.0,
    lastActivity: "3h ago",
    risk: "Low",
  },
  {
    address: "8vB3nM6qW2eR5tY9uI1oP4aS7dF2gH5j",
    label: "Degen Rotator",
    category: "Trader",
    score: 79,
    winRate: 55.3,
    pnl7d: -2140.65,
    totalProfit: 96800.25,
    lastActivity: "14m ago",
    risk: "High",
  },
  {
    address: "5eR8tY2uI6oP9aS3dF7gH1jK4lZ8xC2v",
    label: "Cross-Chain Whale",
    category: "Whale",
    score: 93,
    winRate: 70.6,
    pnl7d: 31280.4,
    totalProfit: 998120.6,
    lastActivity: "41m ago",
    risk: "Medium",
  },
  {
    address: "1jK4lZ7xC9vB3nM6qW2eR5tY8uI1oP4a",
    label: "LP Farmer",
    category: "Smart Money",
    score: 86,
    winRate: 66.9,
    pnl7d: 7420.11,
    totalProfit: 214560.3,
    lastActivity: "1h ago",
    risk: "Medium",
  },
  {
    address: "6qW2eR5tY8uI1oP4aS7dF2gH5jK8lZ1x",
    label: "MEV Runner",
    category: "Bot",
    score: 82,
    winRate: 58.7,
    pnl7d: 4980.02,
    totalProfit: 158940.75,
    lastActivity: "just now",
    risk: "High",
  },
]

export const syncWallets: SyncWallet[] = [
  {
    address: "7xPqK4mN8vR2tYuI9oL3aS6dF1gH5jK2b",
    label: "Solana OG",
    category: "Whale",
    score: 96,
    pnl7d: 4250.41,
    health: 98,
    lastActivity: "2m ago",
    status: "Synced",
    copiedTrades: 128,
    strategy: "Momentum Long",
  },
  {
    address: "9kLmN2pQ7rS4tU8vW1xY6zA3bC5dE9fG",
    label: "Momentum Desk",
    category: "Smart Money",
    score: 91,
    pnl7d: 2890.11,
    health: 94,
    lastActivity: "6m ago",
    status: "Synced",
    copiedTrades: 96,
    strategy: "Aggressive Sniper",
  },
  {
    address: "4tRvB8nM3kL9pQ2wE7yU1iO6aS4dF8gH",
    label: "Sniper 04",
    category: "Bot",
    score: 88,
    pnl7d: 1180.9,
    health: 72,
    lastActivity: "just now",
    status: "Syncing",
    copiedTrades: 311,
    strategy: "Aggressive Sniper",
  },
  {
    address: "2aS5dF8gH1jK4lZ7xC9vB3nM6qW2eR5t",
    label: "Quiet Accumulator",
    category: "Investor",
    score: 84,
    pnl7d: 640.25,
    health: 88,
    lastActivity: "3h ago",
    status: "Paused",
    copiedTrades: 24,
    strategy: "Blue Chip Only",
  },
  {
    address: "8vB3nM6qW2eR5tY9uI1oP4aS7dF2gH5j",
    label: "Degen Rotator",
    category: "Trader",
    score: 79,
    pnl7d: -318.4,
    health: 41,
    lastActivity: "14m ago",
    status: "Error",
    copiedTrades: 57,
    strategy: "Mean Reversion",
  },
  {
    address: "1jK4lZ7xC9vB3nM6qW2eR5tY8uI1oP4a",
    label: "LP Farmer",
    category: "Smart Money",
    score: 86,
    pnl7d: 1720.63,
    health: 91,
    lastActivity: "1h ago",
    status: "Synced",
    copiedTrades: 43,
    strategy: "LP Rotation",
  },
]

export const strategies: Strategy[] = [
  {
    id: "st_1",
    name: "Momentum Long",
    wallets: 8,
    positionSize: "2.5% of balance",
    mode: "Instant",
    pnl: 6321.23,
    pnlPct: 16.45,
    winRate: 72.1,
    status: "Active",
  },
  {
    id: "st_2",
    name: "Aggressive Sniper",
    wallets: 4,
    positionSize: "1.0 SOL fixed",
    mode: "Instant",
    pnl: 2890.11,
    pnlPct: 12.11,
    winRate: 64.8,
    status: "Active",
  },
  {
    id: "st_3",
    name: "Mean Reversion",
    wallets: 3,
    positionSize: "1.5% of balance",
    mode: "Delayed",
    pnl: 4180.4,
    pnlPct: 9.32,
    winRate: 58.4,
    status: "Active",
  },
  {
    id: "st_4",
    name: "LP Rotation",
    wallets: 2,
    positionSize: "0.75 SOL fixed",
    mode: "Manual",
    pnl: 1720.63,
    pnlPct: 5.18,
    winRate: 61.2,
    status: "Paused",
  },
  {
    id: "st_5",
    name: "Blue Chip Only",
    wallets: 5,
    positionSize: "4.0% of balance",
    mode: "Delayed",
    pnl: 3280.75,
    pnlPct: 7.94,
    winRate: 69.5,
    status: "Active",
  },
  {
    id: "st_6",
    name: "Experimental Scalp",
    wallets: 0,
    positionSize: "0.25 SOL fixed",
    mode: "Instant",
    pnl: 0,
    pnlPct: 0,
    winRate: 0,
    status: "Draft",
  },
]

export type LiveTx = {
  id: number
  time: string
  wallet: string
  side: "Buy" | "Sell"
  token: string
  amount: string
  value: string
  block: string
}

export const liveTransactions: LiveTx[] = [
  { id: 1, time: "12:04:18", wallet: "Solana OG", side: "Buy", token: "DOOM", amount: "128,400", value: "$3,120", block: "298431901" },
  { id: 2, time: "12:04:02", wallet: "Sniper 04", side: "Buy", token: "NEEGY", amount: "44,120", value: "$894", block: "298431874" },
  { id: 3, time: "12:03:41", wallet: "Momentum Desk", side: "Sell", token: "WIF", amount: "9,840", value: "$2,410", block: "298431802" },
  { id: 4, time: "12:03:12", wallet: "LP Farmer", side: "Buy", token: "JUP", amount: "18,200", value: "$1,180", block: "298431744" },
  { id: 5, time: "12:02:55", wallet: "Degen Rotator", side: "Sell", token: "POPCAT", amount: "2,410", value: "$640", block: "298431701" },
  { id: 6, time: "12:02:31", wallet: "Solana OG", side: "Buy", token: "PYTH", amount: "51,300", value: "$5,540", block: "298431655" },
  { id: 7, time: "12:02:04", wallet: "MEV Runner", side: "Sell", token: "BONK", amount: "9,120,000", value: "$318", block: "298431590" },
  { id: 8, time: "12:01:48", wallet: "Quiet Accumulator", side: "Buy", token: "SOL", amount: "142", value: "$21,940", block: "298431544" },
]

export const tokenMovements = [
  { token: "DOOM", net: 18.4, volume: "$412K", wallets: 6 },
  { token: "NEEGY", net: -6.2, volume: "$188K", wallets: 3 },
  { token: "JUP", net: 11.8, volume: "$904K", wallets: 9 },
  { token: "WIF", net: -3.1, volume: "$620K", wallets: 5 },
  { token: "PYTH", net: 24.6, volume: "$338K", wallets: 4 },
]

export type TradingWallet = {
  id: number
  label: string
  address: string
  balanceSol: number
  balanceUsd: number
  allocated: number
  assignedStrategy: string | null
  status: "Active" | "Paused" | "Draft"
  openPositions: number
  pnl: number
  pnlPct: number
  createdAt: string
}

export const tradingWallets: TradingWallet[] = [
  {
    id: 1,
    label: "TW Main",
    address: "6xF9pQr4vNc2LmT8sBkY3wHdEuZa1JgQ3mJ8",
    balanceSol: 184.42,
    balanceUsd: 28410.55,
    allocated: 62,
    assignedStrategy: "Momentum Long",
    status: "Active",
    openPositions: 6,
    pnl: 4250.41,
    pnlPct: 18.32,
    createdAt: "Feb 12, 2026",
  },
  {
    id: 2,
    label: "TW Growth",
    address: "9kLm2Rt7yUv5NbQ4xWzE8sPdCaHg6JfK7dJ2",
    balanceSol: 96.18,
    balanceUsd: 14812.9,
    allocated: 48,
    assignedStrategy: "Aggressive Sniper",
    status: "Active",
    openPositions: 4,
    pnl: 2890.11,
    pnlPct: 12.11,
    createdAt: "Mar 04, 2026",
  },
  {
    id: 3,
    label: "TW Range",
    address: "3pQw8Yt2mNc9LrK5vBdZ6xUeHa4JsGf1nR7c",
    balanceSol: 58.7,
    balanceUsd: 9042.18,
    allocated: 31,
    assignedStrategy: "Range Farmer",
    status: "Active",
    openPositions: 3,
    pnl: 1180.64,
    pnlPct: 6.84,
    createdAt: "Mar 28, 2026",
  },
  {
    id: 4,
    label: "TW Scout",
    address: "7dRv4Xn8kJt3MbQ2yWcE9sLpZa5HgUf6qT1w",
    balanceSol: 22.05,
    balanceUsd: 3396.7,
    allocated: 14,
    assignedStrategy: "New Pool Scout",
    status: "Paused",
    openPositions: 0,
    pnl: -412.28,
    pnlPct: -4.02,
    createdAt: "Apr 16, 2026",
  },
  {
    id: 5,
    label: "TW Reserve",
    address: "2mJc9Wq5vTn7RbK8xYdE4sZpLa3HgUf2kP6y",
    balanceSol: 310.9,
    balanceUsd: 47878.2,
    allocated: 0,
    assignedStrategy: null,
    status: "Draft",
    openPositions: 0,
    pnl: 0,
    pnlPct: 0,
    createdAt: "May 02, 2026",
  },
]

export function formatCurrency(value: number, digits = 2) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : ""
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function shortAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}
