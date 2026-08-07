"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Code2,
  Search,
  Terminal,
  Webhook,
  Wrench,
} from "lucide-react"
import { SectionHeader } from "@/components/dashboard/primitives"
import { sectionHref } from "@/lib/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"

const guides = [
  {
    icon: BookOpen,
    title: "Getting started",
    description:
      "Connect a trading wallet, add your first sync wallet and route it through a strategy.",
    articles: ["Platform overview", "Connect a trading wallet", "Your first sync"],
    tag: "Basics",
  },
  {
    icon: Wrench,
    title: "Strategy reference",
    description:
      "Every field in the strategy builder — position sizing, slippage bounds, filters and cooldowns.",
    articles: ["Sizing modes", "Slippage & priority fees", "Token filters"],
    tag: "Core",
  },
  {
    icon: Terminal,
    title: "Execution engine",
    description:
      "How trades are detected, simulated and landed on chain, including retry and skip semantics.",
    articles: ["Detection pipeline", "Simulation & guards", "Skip reasons"],
    tag: "Core",
  },
  {
    icon: Code2,
    title: "REST API",
    description:
      "Read wallet intel, manage sync wallets and strategies programmatically with API keys.",
    articles: ["Authentication", "Wallets endpoint", "Strategies endpoint"],
    tag: "API",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description:
      "Subscribe to execution, skip and failure events and verify signed payloads.",
    articles: ["Event types", "Signature verification", "Retries"],
    tag: "API",
  },
]

const endpoints = [
  { method: "GET", path: "/v1/sync-wallets", description: "List all synced wallets" },
  { method: "POST", path: "/v1/sync-wallets", description: "Add a wallet to sync" },
  { method: "GET", path: "/v1/strategies", description: "List sync strategies" },
  { method: "PATCH", path: "/v1/strategies/:id", description: "Update a strategy" },
  { method: "GET", path: "/v1/activity", description: "Paginated execution history" },
]

const methodColor: Record<string, string> = {
  GET: "bg-chart-2/15 text-chart-2",
  POST: "bg-success/15 text-success",
  PATCH: "bg-chart-4/15 text-chart-4",
}

export function DocumentationSection() {
  const [query, setQuery] = useState("")

  const filtered = guides.filter((guide) => {
    const haystack = [guide.title, guide.description, guide.tag, ...guide.articles]
      .join(" ")
      .toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Documentation"
        description="Guides, references and API documentation for wallet syncing, strategies and execution."
      >
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={<a href={sectionHref("dashboard")} />}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to dashboard
        </Button>
      </SectionHeader>

      <InputGroup className="max-w-md">
        <InputGroupInput
          placeholder="Search the docs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>

      {filtered.length === 0 ? (
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No matching articles</EmptyTitle>
            <EmptyDescription>
              Nothing matches &ldquo;{query}&rdquo;. Try a broader term such as slippage or webhook.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((guide) => (
            <Card key={guide.title} className="justify-between">
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <guide.icon className="size-4" />
                </div>
                <CardTitle className="mt-3 flex items-center gap-2 text-base">
                  {guide.title}
                  <Badge variant="outline" className="font-normal">
                    {guide.tag}
                  </Badge>
                </CardTitle>
                <CardDescription className="leading-relaxed">
                  {guide.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Separator />
                {guide.articles.map((article) => (
                  <button
                    key={article}
                    type="button"
                    className="group flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {article}
                    <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API quick reference</CardTitle>
          <CardDescription>
            Base URL <code className="font-mono text-xs">https://api.syncdesk.io</code> — authenticate
            with a bearer API key from Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {endpoints.map((endpoint) => (
            <div
              key={`${endpoint.method}-${endpoint.path}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5"
            >
              <Badge
                variant="secondary"
                className={`w-16 justify-center font-mono text-[11px] ${methodColor[endpoint.method]}`}
              >
                {endpoint.method}
              </Badge>
              <code className="font-mono text-sm">{endpoint.path}</code>
              <span className="ml-auto text-xs text-muted-foreground">
                {endpoint.description}
              </span>
            </div>
          ))}
          <div className="pt-2">
            <Button variant="outline" size="sm">
              <Code2 data-icon="inline-start" />
              Open full API reference
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
