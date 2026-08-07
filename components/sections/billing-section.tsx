"use client"

import { ArrowUpRight, Check, CreditCard, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SectionHeader, StatusBadge } from "@/components/dashboard/primitives"
import { currentPlan, plans } from "@/lib/plans"
import { sectionHref } from "@/lib/navigation"

const usage = [
  { label: "Sync wallets", used: 14, limit: currentPlan.limits.syncWallets, unit: "wallets" },
  {
    label: "Active strategies",
    used: 6,
    limit: currentPlan.limits.strategies,
    unit: "strategies",
  },
  { label: "Trading wallets", used: 5, limit: currentPlan.limits.tradingWallets, unit: "wallets" },
  { label: "Executions", used: 4318, limit: 10000, unit: "per month" },
]

const invoices = [
  { id: "INV-2026-0072", date: "Jun 01, 2026", amount: "$29.00", status: "Paid" },
  { id: "INV-2026-0061", date: "May 01, 2026", amount: "$29.00", status: "Paid" },
  { id: "INV-2026-0049", date: "Apr 01, 2026", amount: "$29.00", status: "Paid" },
  { id: "INV-2026-0038", date: "Mar 01, 2026", amount: "$0.00", status: "Paid" },
]

export function BillingSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Billing"
        description="Manage subscription plans, usage limits and payment history."
      >
        <Button variant="outline" size="lg">
          <CreditCard data-icon="inline-start" />
          Payment method
        </Button>
      </SectionHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Current plan</CardTitle>
            <CardDescription>Renews on July 1, 2026 · billed monthly</CardDescription>
            <CardAction>
              <Badge variant="secondary" className="bg-primary/15 text-primary">
                {currentPlan.name}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-semibold tracking-tight tabular">
                ${currentPlan.price}
              </span>
              <span className="pb-1 text-sm text-muted-foreground">/ month</span>
            </div>
            <Separator />
            <div className="grid gap-5 sm:grid-cols-2">
              {usage.map((item) => {
                const pct = Math.round((item.used / item.limit) * 100)
                return (
                  <div key={item.label} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground tabular">
                        {item.used.toLocaleString("en-US")} / {item.limit.toLocaleString("en-US")}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <span className="text-xs text-muted-foreground">
                      {pct}% of {item.unit} used
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t border-border">
            <Button nativeButton={false} render={<a href={sectionHref("plans")} />}>
              Compare plans
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plans</CardTitle>
            <CardDescription>Change tier at any time, prorated instantly.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="flex flex-col gap-2 rounded-xl bg-muted/30 p-4 ring-1 ring-transparent data-[current=true]:bg-primary/8 data-[current=true]:ring-primary/30"
                data-current={plan.name === currentPlan.name}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{plan.name}</span>
                  <span className="text-sm tabular">${plan.price}/mo</span>
                </div>
                <ul className="flex flex-col gap-1">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <Check className="size-3 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.name === currentPlan.name ? (
                  <Badge variant="outline" className="w-fit text-[10px]">
                    Current plan
                  </Badge>
                ) : null}
              </div>
            ))}
          </CardContent>
          <CardFooter className="border-t border-border">
            <Button
              variant="outline"
              className="w-full"
                nativeButton={false}
                render={<a href={sectionHref("plans")} />}
              >
              View all plan details
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">Payment history</h2>
            <p className="text-xs text-muted-foreground">Invoices from the last 12 months.</p>
          </div>
          <Button variant="outline" size="sm">
            <Download data-icon="inline-start" />
            Export CSV
          </Button>
        </div>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="pl-5 font-medium tabular">{invoice.id}</TableCell>
                  <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell className="text-right tabular">{invoice.amount}</TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button variant="ghost" size="xs">
                      <Download data-icon="inline-start" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
