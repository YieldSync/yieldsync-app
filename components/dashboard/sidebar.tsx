"use client"

import {
  BookOpen,
  ChevronsUpDown,
  Headset,
  LogOut,
  MessageSquare,
  Moon,
  Sun,
  Waves,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { planDisplayName } from "@/lib/trading-wallets/api"
import {
  navGroups,
  navItems,
  sectionHref,
  type SectionId,
} from "@/lib/navigation"
import { NotificationsMenu } from "@/components/dashboard/notifications-menu"

export function Sidebar({
  active,
  onNavigate,
}: {
  active: SectionId
  onNavigate?: () => void
}) {
  const { supabase } = useSupabaseAuth()
  const { label, initial, email, profile } = useCurrentUser()
  const planLabel = planDisplayName(profile?.planName ?? "free", profile?.isAdmin)

  async function handleSignOut() {
    try {
      if (supabase) await supabase.auth.signOut()
    } catch {
      // fall through to server sign-out
    }
    // Always clear cookies server-side — client env/session can be missing
    window.location.assign("/auth/signout")
  }

  const { scheme, toggle } = useColorScheme()

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Waves className="size-4" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">YieldSync</span>
          <span className="text-[11px] text-muted-foreground">Execution layer</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => {
          const items = navItems.filter((item) => item.group === group)
          if (items.length === 0) return null
          return (
            <div key={group} className="flex flex-col gap-1">
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {group}
              </p>
              {items.map((item) => (
                <NavLink
                  key={item.id}
                  item={item}
                  active={item.id === active}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )
        })}
      </nav>

      <div className="flex shrink-0 flex-col gap-1 border-t border-border px-3 py-2">
        <NotificationsMenu onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/60 data-[popup-open]:bg-sidebar-accent/60"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1 leading-none">
                  <span className="max-w-full truncate text-sm font-medium">
                    {label}
                  </span>
                  <Badge
                    variant="secondary"
                    className="h-4 rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary"
                  >
                    {planLabel}
                  </Badge>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
              </button>
            }
          />
          <DropdownMenuContent align="end" side="top" className="w-60">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="size-9 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium">{label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email ?? "—"}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={<a href={sectionHref("settings")} onClick={onNavigate} />}
              >
                <Headset />
                Support
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<a href={sectionHref("documentation")} onClick={onNavigate} />}
              >
                <BookOpen />
                Documentation
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<a href={sectionHref("settings")} onClick={onNavigate} />}
              >
                <MessageSquare />
                Share feedback
              </DropdownMenuItem>
              <DropdownMenuItem closeOnClick={false} onClick={toggle}>
                {scheme === "dark" ? <Sun /> : <Moon />}
                {scheme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: (typeof navItems)[number]
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <a
      href={sectionHref(item.id)}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
      )}
    >
      {active ? (
        <span className="absolute top-1.5 bottom-1.5 -left-3 w-0.5 rounded-r bg-primary" />
      ) : null}
      <item.icon className={cn("size-4 shrink-0", active && "text-primary")} />
      <span className="flex-1 truncate font-medium">{item.title}</span>
    </a>
  )
}
