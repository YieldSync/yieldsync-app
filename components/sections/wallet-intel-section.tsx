"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Plus, Search, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Money, SectionHeader, StatCard } from "@/components/dashboard/primitives"
import { intelWallets, shortAddress, type WalletCategory } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Brain, Trophy, Wallet2 } from "lucide-react"

const categories: (WalletCategory | "All")[] = [
  "All",
  "Whale",
  "Smart Money",
  "Trader",
  "Investor",
  "Bot",
]

const categoryStyles: Record<WalletCategory, string> = {
  Whale: "bg-chart-3/15 text-chart-3",
  "Smart Money": "bg-primary/15 text-primary",
  Trader: "bg-chart-4/15 text-chart-4",
  Investor: "bg-success/15 text-success",
  Bot: "bg-muted text-muted-foreground",
}

const riskStyles = {
  Low: "text-success",
  Medium: "text-chart-4",
  High: "text-destructive",
} as const

export function WalletIntelSection() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("All")
  const [risk, setRisk] = useState<string>("all")
  const [copied, setCopied] = useState<string | null>(null)

  const rows = useMemo(() => {
    return intelWallets.filter((wallet) => {
      const matchesQuery =
        query.trim() === "" ||
        wallet.address.toLowerCase().includes(query.toLowerCase()) ||
        wallet.label.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = category === "All" || wallet.category === category
      const matchesRisk = risk === "all" || wallet.risk.toLowerCase() === risk
      return matchesQuery && matchesCategory && matchesRisk
    })
  }, [query, category, risk])

  function copyAddress(address: string) {
    navigator.clipboard?.writeText(address)
    setCopied(address)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Discover"
        description="Discover and analyze profitable wallets based on performance, behavior and on-chain activity."
      >
        <Button variant="outline" size="lg">
          <SlidersHorizontal data-icon="inline-start" />
          Advanced filters
        </Button>
      </SectionHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Indexed Wallets"
          value="1,284,902"
          sub="across 4 networks"
          icon={Wallet2}
        />
        <StatCard
          label="Qualified Alpha Wallets"
          value="3,418"
          sub="score ≥ 80"
          delta={4.2}
          icon={Brain}
        />
        <StatCard
          label="Top 7D PnL"
          value="+$42,310.55"
          sub="Solana OG"
          delta={18.9}
          icon={Trophy}
        />
      </div>

      <Card className="py-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <InputGroup className="max-w-sm flex-1">
            <InputGroupInput
              placeholder="Search by address or label…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>

          <Select value={category} onValueChange={(value) => setCategory(value as string)}>
            <SelectTrigger size="default" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "All" ? "All categories" : item}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={risk} onValueChange={(value) => setRisk(value as string)}>
            <SelectTrigger size="default" className="min-w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All risk</SelectItem>
                <SelectItem value="low">Low risk</SelectItem>
                <SelectItem value="medium">Medium risk</SelectItem>
                <SelectItem value="high">High risk</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <CardContent className="px-0">
          {rows.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>No wallets matched</EmptyTitle>
                <EmptyDescription>
                  Adjust your search term, category or risk filter to widen the results.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Address</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-32">Score</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">7D PNL</TableHead>
                    <TableHead className="text-right">Total Profit</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="pr-5 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((wallet) => (
                    <TableRow key={wallet.address}>
                      <TableCell className="pl-5">
                        <button
                          type="button"
                          onClick={() => copyAddress(wallet.address)}
                          className="inline-flex items-center gap-1.5 font-medium tabular hover:text-primary"
                        >
                          {shortAddress(wallet.address)}
                          {copied === wallet.address ? (
                            <Check className="size-3.5 text-success" />
                          ) : (
                            <Copy className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">{wallet.label}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={categoryStyles[wallet.category]}
                        >
                          {wallet.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={wallet.score} className="h-1.5 w-16" />
                          <span className="text-xs font-medium tabular">{wallet.score}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {wallet.winRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={wallet.pnl7d} />
                      </TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">
                        $
                        {wallet.totalProfit.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular">
                        {wallet.lastActivity}
                      </TableCell>
                      <TableCell className={cn("font-medium", riskStyles[wallet.risk])}>
                        {wallet.risk}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button variant="outline" size="xs">
                          <Plus data-icon="inline-start" />
                          Sync
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Scores combine realized profitability, drawdown resilience, holding behavior and execution
        consistency over a rolling 90 day window.
      </p>
    </div>
  )
}
