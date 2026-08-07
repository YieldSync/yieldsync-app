"use client"

import { useState } from "react"
import { AlertTriangle, Bell, BellOff, CheckCircle2, Info, Settings2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { notificationFeed, type NotificationTone } from "@/lib/notifications"
import { sectionHref } from "@/lib/navigation"

const toneStyles: Record<NotificationTone, { icon: typeof Info; className: string }> = {
  critical: { icon: AlertTriangle, className: "text-destructive" },
  warning: { icon: AlertTriangle, className: "text-warning" },
  success: { icon: CheckCircle2, className: "text-success" },
  info: { icon: Info, className: "text-primary" },
}

export function NotificationsMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [items, setItems] = useState(notificationFeed)

  function dismiss(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Notifications, ${items.length} unread`}
            className="relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground data-[popup-open]:bg-sidebar-accent/60 data-[popup-open]:text-foreground"
          >
            <Bell className="size-4 shrink-0" />
            <span className="flex-1 truncate text-left font-medium">Notifications</span>
            {items.length > 0 ? (
              <Badge
                variant="destructive"
                className="size-5 justify-center rounded-full p-0 text-[10px] tabular"
              >
                {items.length}
              </Badge>
            ) : null}
          </button>
        }
      />
      <DropdownMenuContent align="start" side="top" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          {items.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setItems([])}
            >
              Clear all
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="my-0" />

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <BellOff className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">You are all caught up</p>
            <p className="text-xs text-muted-foreground">
              New wallet and execution alerts will land here.
            </p>
          </div>
        ) : (
          <ul className="flex max-h-80 flex-col overflow-y-auto">
            {items.map((item) => {
              const tone = toneStyles[item.tone]
              return (
                <li
                  key={item.id}
                  className="group flex items-start gap-2.5 border-b border-border px-3 py-2.5 last:border-b-0"
                >
                  <tone.icon className={cn("mt-0.5 size-4 shrink-0", tone.className)} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm leading-tight font-medium">{item.title}</span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular">
                      {item.time}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Dismiss ${item.title}`}
                    className="size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => dismiss(item.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        <DropdownMenuSeparator className="my-0" />
        <a
          href={sectionHref("settings")}
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings2 className="size-3.5" />
          Notification settings
        </a>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
