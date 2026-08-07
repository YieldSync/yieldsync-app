"use client"

import { Check, Copy, Menu, Search, Wallet } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

export function DashboardHeader({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void
}) {
  const [network, setNetwork] = useState("Mainnet")
  const [copied, setCopied] = useState(false)
  const address = "2A7d...9KxL"

  function copy() {
    navigator.clipboard?.writeText("2A7dV8mQ3nL5pW9tR1cY6bK4sF2gH9KxL")
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-8">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <InputGroup className="hidden max-w-xs md:flex">
        <InputGroupInput placeholder="Search wallets, tokens, strategies…" />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Select value={network} onValueChange={(value) => setNetwork(value as string)}>
          <SelectTrigger className="h-9 gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
            <SelectItem value="Mainnet">Mainnet</SelectItem>
            <SelectItem value="Devnet">Devnet</SelectItem>
            <SelectItem value="Testnet">Testnet</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button variant="outline" size="lg" onClick={copy}>
          <Wallet data-icon="inline-start" />
          <span className="tabular">{address}</span>
          {copied ? (
            <Check data-icon="inline-end" className="text-success" />
          ) : (
            <Copy data-icon="inline-end" />
          )}
        </Button>
      </div>
    </header>
  )
}
