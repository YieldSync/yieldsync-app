"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Palette } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useTheme } from "@/components/theme-provider"
import { useCurrentUser } from "@/hooks/use-current-user"
import { DEFAULT_THEME, type ThemeId } from "@/lib/theme/color-presets"
import {
  DEFAULT_CUSTOM_PALETTE,
  normalizeHex,
  parsePaletteJson,
  type CustomPalette,
} from "@/lib/theme/custom-palette"
import { cn } from "@/lib/utils"

const ORDER: ThemeId[] = ["moss", "orange", "purple", "blue"]

const CUSTOM_FIELDS: {
  key: keyof Pick<
    CustomPalette,
    "primary" | "background" | "foreground" | "card" | "mutedForeground"
  >
  label: string
}[] = [
  { key: "primary", label: "Primary / accent" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "card", label: "Card / surface" },
  { key: "mutedForeground", label: "Muted text" },
]

/**
 * Admin-only brand color switcher — presets + custom hex + export JSON.
 */
export function AdminAppearanceCard() {
  const { profile, loading } = useCurrentUser()
  const {
    mode,
    theme,
    setTheme,
    presets,
    custom,
    setCustom,
    enableCustom,
    exportJson,
    activePreset,
  } = useTheme()
  const [copied, setCopied] = useState(false)
  const [importRaw, setImportRaw] = useState("")
  const [importError, setImportError] = useState<string | null>(null)

  const draft = useMemo(() => custom, [custom])

  if (loading || !profile?.isAdmin) return null

  function updateField(
    key: (typeof CUSTOM_FIELDS)[number]["key"],
    value: string,
  ) {
    const hex = normalizeHex(value)
    if (!hex) return
    setCustom({ ...draft, [key]: hex, kind: "custom", version: 1 })
  }

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportJson)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  function applyImport() {
    const parsed = parsePaletteJson(importRaw)
    if (!parsed) {
      setImportError("Invalid JSON — need version:1, kind:custom, and hex colors.")
      return
    }
    setImportError(null)
    setCustom(parsed)
  }

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
          Global brand colors for landing + dashboard. Custom values stay in this
          browser — copy the export JSON and send it to apply permanently.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER.map((id) => {
            const preset = presets[id]
            const active = mode === "preset" && theme === id
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

        <div
          className={cn(
            "rounded-xl border p-4",
            mode === "custom" ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Custom palette</p>
              <p className="text-xs text-muted-foreground">
                Pick hex colors — fluid + buttons update live.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={mode === "custom" ? "default" : "outline"}
              onClick={enableCustom}
            >
              Use custom
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CUSTOM_FIELDS.map(({ key, label }) => (
              <Field key={key}>
                <FieldLabel htmlFor={`custom-${key}`}>{label}</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    id={`custom-${key}-picker`}
                    type="color"
                    value={draft[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                  />
                  <Input
                    id={`custom-${key}`}
                    value={draft[key]}
                    onChange={(e) => {
                      const v = e.target.value
                      if (normalizeHex(v) || v.startsWith("#")) {
                        const hex = normalizeHex(v)
                        if (hex) updateField(key, hex)
                        else setCustom({ ...draft, [key]: v as never })
                      }
                    }}
                    onBlur={(e) => {
                      const hex = normalizeHex(e.target.value)
                      if (hex) updateField(key, hex)
                    }}
                    className="font-mono text-xs uppercase"
                    spellCheck={false}
                  />
                </div>
              </Field>
            ))}
          </div>

          <div className="mt-4 flex h-10 overflow-hidden rounded-lg border border-border">
            {activePreset.chart.map((color) => (
              <span
                key={color}
                className="h-full flex-1"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Export for chat</p>
            <Button type="button" size="sm" variant="outline" onClick={copyExport}>
              {copied ? (
                <>
                  <Check data-icon="inline-start" />
                  Copied
                </>
              ) : (
                <>
                  <Copy data-icon="inline-start" />
                  Copy JSON
                </>
              )}
            </Button>
          </div>
          <Textarea
            readOnly
            value={exportJson}
            className="min-h-[160px] font-mono text-[11px] leading-relaxed"
            onFocus={(e) => e.currentTarget.select()}
          />
          <p className="text-xs text-muted-foreground">
            Copy this block and paste it here in chat — then we can lock it in as
            the production default.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Import JSON</p>
          <Textarea
            value={importRaw}
            onChange={(e) => {
              setImportRaw(e.target.value)
              setImportError(null)
            }}
            placeholder='{"version":1,"kind":"custom","primary":"#3DDC84",...}'
            className="min-h-[100px] font-mono text-[11px]"
          />
          {importError ? (
            <p className="text-xs text-destructive">{importError}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={applyImport}>
              Apply import
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCustom(DEFAULT_CUSTOM_PALETTE)}
            >
              Load starter custom
            </Button>
            {mode !== "preset" || theme !== DEFAULT_THEME ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setTheme(DEFAULT_THEME)}
              >
                Reset to Moss default
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
