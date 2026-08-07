"use client"

import { useState } from "react"
import {
  Copy,
  MoreHorizontal,
  Pause,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Delta,
  Money,
  SectionHeader,
  StatusBadge,
} from "@/components/dashboard/primitives"
import { StrategyBuilder } from "@/components/sections/strategy-builder"
import { strategies } from "@/lib/data"

export function SyncStrategiesSection() {
  const [builderOpen, setBuilderOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Strategies"
        description="Create and manage synchronization rules that define how trades from tracked wallets are executed."
      >
        <Button size="lg" onClick={() => setBuilderOpen((open) => !open)}>
          {builderOpen ? (
            <X data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          {builderOpen ? "Close builder" : "Create strategy"}
        </Button>
      </SectionHeader>

      {builderOpen ? <StrategyBuilder /> : null}

      <Card className="py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">All strategies</h2>
            <p className="text-xs text-muted-foreground">
              {strategies.filter((item) => item.status === "Active").length} active ·{" "}
              {strategies.length} total
            </p>
          </div>
        </div>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Strategy Name</TableHead>
                  <TableHead className="text-right">Assigned Wallets</TableHead>
                  <TableHead>Position Size</TableHead>
                  <TableHead>Execution Mode</TableHead>
                  <TableHead className="text-right">Performance</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategies.map((strategy) => (
                  <TableRow key={strategy.id}>
                    <TableCell className="pl-5 font-medium">{strategy.name}</TableCell>
                    <TableCell className="text-right tabular">{strategy.wallets}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {strategy.positionSize}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{strategy.mode}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end leading-tight">
                        <Money value={strategy.pnl} />
                        <span className="text-xs">
                          <Delta value={strategy.pnlPct} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {strategy.winRate.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={strategy.status} />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Strategy actions"
                            >
                              <MoreHorizontal />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuGroup>
                            <DropdownMenuItem>
                              <Pencil />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pause />
                              Pause
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive">
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
