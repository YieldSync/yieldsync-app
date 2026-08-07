'use client'

import {
  Bell,
  Calendar,
  ChevronRight,
  FileText,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Repeat,
  Search,
  Settings,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/brand'
import { useTheme } from '@/components/theme-provider'

const MENU = [
  { label: 'Dashboard', icon: LayoutGrid, active: true },
  { label: 'Portfolio', icon: Wallet },
  { label: 'Swap', icon: Repeat },
  { label: 'Market Trend', icon: TrendingUp },
  { label: 'Messages', icon: MessageCircle },
]

const MANAGE = [
  { label: 'Reports', icon: FileText },
  { label: 'Calender', icon: Calendar },
  { label: 'Notifications', icon: Bell },
  { label: 'Settings', icon: Settings },
]

const CHAINS = [
  { name: 'EOS Crypto', tag: 'High Speed' },
  { name: 'Solana', tag: 'Low Latency' },
  { name: 'Ethereum Crypto', tag: 'Smart Contracts' },
]

const ACTIVITY = [
  { name: 'Kale Joe', asset: 'ETH' },
  { name: 'Naomi Scott', asset: 'EOS' },
  { name: 'Sarah Stepper', asset: 'ETH' },
]

function ChainIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('size-4', className)}
    >
      <path
        d="M12 2 5.5 12.2 12 16l6.5-3.8L12 2Zm0 19.5L5.5 13.6 12 17.5l6.5-3.9L12 21.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function AreaChart() {
  const { activePreset } = useTheme()
  const primary = activePreset.primary
  const hover = activePreset.primaryHover
  const points =
    '0,86 26,78 52,82 78,66 104,74 130,52 156,60 182,34 208,48 234,22 260,38 286,14 312,30 338,44 364,26 390,40'
  return (
    <svg
      viewBox="0 0 390 100"
      preserveAspectRatio="none"
      className="h-[110px] w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primary} stopOpacity="0.55" />
          <stop offset="100%" stopColor={primary} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${points} 390,100 0,100`} fill="url(#mc-area)" />
      <polyline
        points={points}
        fill="none"
        stroke={hover}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Donut() {
  const { activePreset } = useTheme()
  const [c1, c2, c3] = activePreset.chart
  const segments = [
    { value: 40, color: c1 },
    { value: 35, color: c2 },
    { value: 25, color: c3 },
  ]
  const r = 42
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative mx-auto aspect-square w-[150px]">
      <svg viewBox="0 0 110 110" className="size-full -rotate-90">
        {segments.map((s) => {
          const len = (s.value / 100) * c
          const el = (
            <circle
              key={s.color}
              cx="55"
              cy="55"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="20"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-semibold text-foreground">
          $28,435
        </span>
        <span className="text-[10px] text-muted-foreground">Total</span>
      </div>
    </div>
  )
}

export function DashboardMockup() {
  const { activePreset } = useTheme()
  const [c1, c2, c3] = activePreset.chart

  return (
    <div className="overflow-hidden rounded-[14px] border border-white/10 bg-[#141218] shadow-[var(--glow-accent-lg)]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-[212px] shrink-0 flex-col justify-between border-r border-border bg-[#0c0a10] lg:flex">
          <div>
            <div className="flex h-[62px] items-center gap-2.5 border-b border-border px-5">
              <LogoMark className="h-5 w-5" />
              <span className="text-[15px] font-semibold">YieldSync</span>
            </div>

            <div className="px-4 py-5">
              <div className="mb-3 flex items-center gap-3 px-1">
                <span className="text-[11px] text-muted-foreground">Menu</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <ul className="flex flex-col gap-1">
                {MENU.map((item) => (
                  <li key={item.label}>
                    <span
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]',
                        item.active
                          ? 'bg-primary font-medium text-primary-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mb-3 mt-6 flex items-center gap-3 px-1">
                <span className="text-[11px] text-muted-foreground">
                  Manage
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <ul className="flex flex-col gap-1">
                {MANAGE.map((item) => (
                  <li key={item.label}>
                    <span className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground">
                      <item.icon className="size-4" />
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="m-4 rounded-xl border border-border bg-[#1c1a26] p-4">
            <p className="text-[13px] font-semibold">Upgrade to Pro</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Empower your apps with the hottest trends and real time news.
            </p>
            <span className="mt-3 flex justify-center rounded-lg bg-primary py-2 text-[12px] font-semibold text-primary-foreground">
              Get Started
            </span>
          </div>
        </aside>

        {/* Main — charcoal panel, lighter than outer black / sidebar */}
        <div className="min-w-0 flex-1 bg-[#16141e]">
          <div className="flex h-[62px] items-center justify-between gap-4 border-b border-border px-4 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">Dashboard</p>
              <p className="truncate text-[11px] text-muted-foreground">
                Your central hub for crypto insights and market activity.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-border bg-[#1c1a26] px-3 py-2 md:flex">
                <Search className="size-3.5 text-muted-foreground" />
                <span className="w-[150px] text-[12px] text-muted-foreground">
                  Search
                </span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ⌘
                </span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  K
                </span>
              </div>
              <div className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-[#1c1a26]">
                <Bell className="size-4 text-muted-foreground" />
                <span className="absolute -right-1.5 -top-1.5 rounded-full bg-primary px-1.5 text-[9px] font-semibold text-primary-foreground">
                  10
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4 sm:p-5">
            {/* Chain cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {CHAINS.map((chain) => (
                <div
                  key={chain.name}
                  className="rounded-xl border border-border bg-[#1a1824] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-[#242230] text-foreground">
                        <ChainIcon />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">
                          {chain.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {chain.tag}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md border border-border bg-[#242230] px-2 py-1 text-[10px] text-muted-foreground">
                      Active
                    </span>
                  </div>

                  <div className="mt-4 border-t border-border pt-3">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        Raised{' '}
                        <span className="text-foreground">(74.68%)</span>
                      </span>
                      <span className="text-muted-foreground">
                        <span className="text-foreground">74.000</span> ETH ={' '}
                        <span className="text-foreground">$180.000</span> USD
                      </span>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full w-[74%] rounded-full"
                        style={{
                          background: `linear-gradient(to right, ${c2}, ${c3})`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      To Raise <span className="text-foreground">(100%)</span>
                    </span>
                    <span className="text-muted-foreground">
                      <span className="text-foreground">100.000</span> ETH ={' '}
                      <span className="text-foreground">$243.000</span> USD
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full rounded-full bg-white/15" />

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-[11px] text-muted-foreground">
                      Ending in : <span className="text-foreground">0</span> :
                      <span className="text-foreground">10</span> :
                      <span className="text-foreground">45</span> :
                      <span className="text-foreground">30</span>
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                      Show <ChevronRight className="size-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Portfolio + donut */}
            <div className="grid gap-4 xl:grid-cols-[1.9fr_1fr]">
              <div className="rounded-xl border border-border bg-[#1a1824] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] text-muted-foreground">
                      Portfolio Value
                    </p>
                    <p className="mt-1 text-[26px] font-semibold tracking-tight">
                      +$28,435.00
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {['Income', 'Expense', 'Saving'].map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-border bg-[#242230] px-2.5 py-1 text-[11px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>$40</span>
                  </div>
                  <AreaChart />
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map(
                      (m) => (
                        <span key={m}>{m}</span>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-[#1a1824] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium">Bill &amp; Payments</p>
                  <span className="rounded-md border border-border bg-[#242230] px-2.5 py-1 text-[11px] text-muted-foreground">
                    Weekly
                  </span>
                </div>
                <Donut />
                <ul className="mt-3 flex flex-col gap-1.5">
                  {[
                    { label: 'Gas fees', value: '40%', color: c1 },
                    { label: 'Staking Rewards', value: '35%', color: c2 },
                    { label: 'Exchange Fees', value: '25%', color: c3 },
                  ].map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: row.color }}
                        />
                        {row.label}
                      </span>
                      <span className="text-foreground">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-xl border border-border bg-[#1a1824] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] font-medium">Recent Activity</p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-[#242230] px-3 py-2">
                  <Search className="size-3.5 text-muted-foreground" />
                  <span className="w-[120px] text-[12px] text-muted-foreground">
                    Search
                  </span>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="bg-white/3">
                      <th className="w-10 rounded-l-lg px-3 py-2.5">
                        <span className="block size-3.5 rounded border border-white/25" />
                      </th>
                      {[
                        'User Name',
                        'Top Asset',
                        'Gain/Loss',
                        'Risk Profile',
                        'Wallet Balance',
                        'Last Action',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-[11px] font-normal text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                      <th className="rounded-r-lg px-3 py-2.5 text-right text-[11px] font-normal text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ACTIVITY.map((row) => (
                      <tr key={row.name} className="border-b border-border/60">
                        <td className="px-3 py-3">
                          <span className="flex size-3.5 items-center justify-center rounded bg-primary">
                            <svg
                              viewBox="0 0 12 12"
                              className="size-2.5"
                              aria-hidden="true"
                            >
                              <path
                                d="M2.5 6.3 4.6 8.4 9.5 3.5"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[12px]">{row.name}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          {row.asset}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          +9.87%
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          Medium
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          $12,450
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">
                          Swapped to USDT
                        </td>
                        <td className="px-3 py-3 text-right">
                          <MoreHorizontal className="ml-auto size-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
