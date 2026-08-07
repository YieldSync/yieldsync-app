"use client"

import { useState } from "react"
import { Check, Minus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SectionHeader } from "@/components/dashboard/primitives"
import { currentPlanName, planComparison, plans } from "@/lib/plans"

const faqs = [
  {
    question: "Can I change plan at any time?",
    answer:
      "Yes. Upgrades apply instantly and are prorated, downgrades take effect at the end of the current billing period.",
  },
  {
    question: "What happens to wallets above the new limit?",
    answer:
      "Synced wallets beyond the plan limit are paused instead of deleted, so you keep their history and can reactivate them later.",
  },
  {
    question: "Do you take a cut of trading profits?",
    answer:
      "No performance fee. You pay the flat subscription plus the usual Solana network and priority fees.",
  },
]

export function PlansSection() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly")
  const yearly = cycle === "yearly"

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Plans"
        description="Pick the tier that matches how many wallets you track and how much you automate. Every plan includes the full execution engine."
      >
        <ToggleGroup
          value={[cycle]}
          onValueChange={(value) => {
            const next = value[0]
            if (next === "monthly" || next === "yearly") setCycle(next)
          }}
        >
          <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
          <ToggleGroupItem value="yearly">Yearly · -20%</ToggleGroupItem>
        </ToggleGroup>
      </SectionHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlanName
          const price = yearly ? Math.round(plan.price * 12 * 0.8) : plan.price
          return (
            <Card
              key={plan.name}
              className={cn(
                "relative",
                plan.popular && "ring-1 ring-primary/40",
                isCurrent && "bg-primary/6"
              )}
            >
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  {plan.name}
                  {plan.popular ? (
                    <Badge className="text-[10px] tracking-wide uppercase">
                      Most popular
                    </Badge>
                  ) : null}
                  {isCurrent ? (
                    <Badge variant="outline" className="text-[10px]">
                      Current
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription className="min-h-10 text-pretty">
                  {plan.audience}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight tabular">
                    ${price}
                  </span>
                  <span className="pb-1.5 text-sm text-muted-foreground">
                    /{yearly ? "yr" : "mo"}
                  </span>
                </div>
                <Separator />
                <ul className="flex flex-1 flex-col gap-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Current plan" : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <Card className="py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">Compare plans</h2>
            <p className="text-xs text-muted-foreground">
              Limits and capabilities side by side.
            </p>
          </div>
          <Badge variant="secondary" className="bg-primary/15 text-primary">
            <Sparkles data-icon="inline-start" />
            {currentPlanName}
          </Badge>
        </div>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Capability</TableHead>
                  {plans.map((plan) => (
                    <TableHead key={plan.name} className="text-center last:pr-5">
                      {plan.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {planComparison.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="pl-5 font-medium">{row.label}</TableCell>
                    {row.values.map((value, index) => (
                      <TableCell
                        key={`${row.label}-${plans[index].name}`}
                        className="text-center last:pr-5"
                      >
                        {typeof value === "boolean" ? (
                          value ? (
                            <Check className="mx-auto size-4 text-success" />
                          ) : (
                            <Minus className="mx-auto size-4 text-muted-foreground" />
                          )
                        ) : (
                          <span className="tabular">{value}</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {faqs.map((faq) => (
          <Card key={faq.question}>
            <CardHeader>
              <CardTitle className="text-sm">{faq.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {faq.answer}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
