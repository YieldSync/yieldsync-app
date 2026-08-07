"use client"

import { Palette } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTheme } from "@/components/theme-provider"
import { useCurrentUser } from "@/hooks/use-current-user"
import { DEFAULT_THEME, type ThemeId } from "@/lib/theme/color-presets"
import { cn } from "@/lib/utils"

const ORDER: ThemeId[] = ["moss", "orange", "purple", "blue"]

/**
 * Admin-only brand color switcher — updates html[data-theme] for landing + dashboard.
 */
export function AdminAppearanceCard() {
  const { profile, loading } = useCurrentUser()
  const { theme, setTheme, presets } = useTheme()

  if (loading || !profile?.isAdmin) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="size-4 text-primary" />
          Appearance
          <Badge variant="outline" className="ml-1 font-normal">
            Admin
          </Badge>
        </CardTitle>
        <CardDescription>
          Global brand colors for landing page and dashboard. Preview is stored
          in this browser only.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER.map((id) => {
            const preset = presets[id]
            const active = theme === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <div className="flex h-10 overflow-hidden rounded-lg">
                  {preset.chart.map((color) => (
                    <span
                      key={color}
                      className="h-full flex-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{preset.label}</span>
                  <span
                    className="size-3 rounded-full ring-2 ring-background"
                    style={{ backgroundColor: preset.primary }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {theme !== DEFAULT_THEME ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Default production theme is {presets[DEFAULT_THEME].label}.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTheme(DEFAULT_THEME)}
            >
              Reset default
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
