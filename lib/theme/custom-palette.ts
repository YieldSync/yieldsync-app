import {
  LIQUID_MOTION_HERO,
  type LiquidStops,
  type ThemePreset,
} from "@/lib/theme/color-presets"

/** Editable brand tokens — send this JSON back when you like a look. */
export type CustomPalette = {
  version: 1
  kind: "custom"
  primary: string
  background: string
  foreground: string
  card: string
  mutedForeground: string
  primaryForeground?: string
  label?: string
}

export const CUSTOM_STORAGE_KEY = "ys-brand-custom"

const HEX = /^#([0-9a-fA-F]{6})$/

export function isHexColor(value: string): boolean {
  return HEX.test(value.trim())
}

export function normalizeHex(value: string): string | null {
  const v = value.trim()
  if (HEX.test(v)) return v.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toLowerCase()}`
  return null
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  )
}

function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastText(bg: string): string {
  const rgb = hexToRgb(bg)
  return luminance(rgb) > 0.45 ? "#0a0c0b" : "#f4f7f5"
}

function to01(rgb: [number, number, number]): [number, number, number] {
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]
}

export const DEFAULT_CUSTOM_PALETTE: CustomPalette = {
  version: 1,
  kind: "custom",
  label: "Custom",
  primary: "#3DDC84",
  background: "#050605",
  foreground: "#F3F6F4",
  card: "#121614",
  mutedForeground: "#A7B2AB",
  primaryForeground: "#04140A",
}

export function buildLiquidFromPalette(p: CustomPalette): LiquidStops {
  const bg = hexToRgb(p.background)
  const prim = hexToRgb(p.primary)
  const fg = hexToRgb(p.foreground)
  return {
    dark1: to01(mix(bg, [0, 0, 0], 0.35)),
    dark2: to01(mix(bg, prim, 0.22)),
    light1: to01(mix(prim, bg, 0.25)),
    primary: to01(prim),
    light2: to01(mix(prim, fg, 0.45)),
  }
}

/** Full preset-shaped object for liquid / mockup consumers. */
export function customToPreset(p: CustomPalette): ThemePreset {
  const primary = p.primary
  const rgb = hexToRgb(primary)
  const hover = rgbToHex(...mix(rgb, [255, 255, 255], 0.22))
  const deep = rgbToHex(...mix(rgb, [0, 0, 0], 0.35))
  const soft = rgbToHex(...mix(rgb, hexToRgb(p.foreground), 0.35))
  const mid = rgbToHex(...mix(rgb, hexToRgb(p.background), 0.2))

  return {
    id: "moss", // unused when custom; liquid uses this shape
    label: p.label ?? "Custom",
    primary,
    primaryHover: hover,
    primaryMuted: `${primary}1f`,
    chart: [primary, hover, soft, deep, mid],
    liquidFallback: `bg-[radial-gradient(130%_110%_at_30%_45%,${primary}_0%,${deep}_45%,${p.background}_100%)]`,
    liquid: buildLiquidFromPalette(p),
    motion: LIQUID_MOTION_HERO,
  }
}

/** Inline CSS variables for custom theme (overrides data-theme tokens). */
export function applyCustomCssVars(
  p: CustomPalette,
  scheme: "dark" | "light" = "dark",
) {
  const root = document.documentElement
  const rgb = hexToRgb(p.primary)
  const [pr, pg, pb] = rgb

  if (scheme === "light") {
    const primary = softMix(p.primary, "#000000", 0.18)
    const primaryRgb = hexToRgb(primary)
    const background = softMix("#ffffff", p.primary, 0.05)
    const foreground = softMix(p.background, "#000000", 0.75)
    const card = "#ffffff"
    const mutedFg = softMix(foreground, "#ffffff", 0.4)
    const hover = softMix(primary, "#ffffff", 0.18)
    const active = softMix(primary, "#000000", 0.12)
    const primaryFg = "#ffffff"
    const [lr, lg, lb] = primaryRgb

    const map: Record<string, string> = {
      "--background": background,
      "--surface": softMix(background, "#000000", 0.03),
      "--foreground": foreground,
      "--card": card,
      "--card-foreground": foreground,
      "--popover": card,
      "--popover-foreground": foreground,
      "--primary": primary,
      "--primary-foreground": primaryFg,
      "--secondary": softMix(background, "#000000", 0.04),
      "--secondary-foreground": foreground,
      "--muted": softMix(background, "#000000", 0.04),
      "--muted-foreground": mutedFg,
      "--accent": softMix(background, primary, 0.08),
      "--accent-foreground": foreground,
      "--ring": primary,
      "--chart-1": primary,
      "--chart-2": hover,
      "--chart-3": softMix(primary, "#000000", 0.25),
      "--chart-4": softMix(primary, "#ffffff", 0.35),
      "--chart-5": softMix(primary, "#ffffff", 0.55),
      "--sidebar": softMix(background, "#000000", 0.02),
      "--sidebar-foreground": foreground,
      "--sidebar-primary": primary,
      "--sidebar-primary-foreground": primaryFg,
      "--sidebar-accent": softMix(background, primary, 0.1),
      "--sidebar-accent-foreground": foreground,
      "--sidebar-ring": primary,
      "--background-elevated": card,
      "--background-subtle": softMix(background, "#000000", 0.02),
      "--background-muted": softMix(background, "#000000", 0.04),
      "--foreground-secondary": foreground,
      "--foreground-muted": mutedFg,
      "--accent-hover": hover,
      "--accent-active": active,
      "--accent-muted": `${primary}1f`,
      "--border": "rgba(12, 20, 16, 0.12)",
      "--input": "rgba(12, 20, 16, 0.14)",
      "--border-accent": `${primary}40`,
      "--glow-accent": `0 0 24px rgba(${lr}, ${lg}, ${lb}, 0.22)`,
      "--glow-accent-lg": `0 0 40px rgba(${lr}, ${lg}, ${lb}, 0.25)`,
      "--glow-button": `0 10px 36px -8px color-mix(in srgb, ${primary} 50%, transparent)`,
      "--success": primary,
      "--success-foreground": primaryFg,
    }
    Object.entries(map).forEach(([k, v]) => root.style.setProperty(k, v))
    return
  }

  const primaryFg = p.primaryForeground ?? contrastText(p.primary)
  const hover = rgbToHex(...mix(rgb, [255, 255, 255], 0.22))
  const active = rgbToHex(...mix(rgb, [0, 0, 0], 0.18))

  const map: Record<string, string> = {
    "--background": p.background,
    "--surface": p.background,
    "--foreground": p.foreground,
    "--card": p.card,
    "--card-foreground": p.foreground,
    "--popover": p.card,
    "--popover-foreground": p.foreground,
    "--primary": p.primary,
    "--primary-foreground": primaryFg,
    "--secondary": p.card,
    "--secondary-foreground": p.foreground,
    "--muted": p.card,
    "--muted-foreground": p.mutedForeground,
    "--accent": p.card,
    "--accent-foreground": p.foreground,
    "--ring": p.primary,
    "--chart-1": p.primary,
    "--chart-2": hover,
    "--chart-3": softMix(p.primary, p.foreground, 0.35),
    "--chart-4": softMix(p.primary, p.background, 0.35),
    "--chart-5": softMix(p.primary, "#000000", 0.5),
    "--sidebar": softMix(p.background, "#000000", 0.25),
    "--sidebar-foreground": p.foreground,
    "--sidebar-primary": p.primary,
    "--sidebar-primary-foreground": primaryFg,
    "--sidebar-accent": p.card,
    "--sidebar-accent-foreground": p.foreground,
    "--sidebar-ring": p.primary,
    "--background-elevated": p.card,
    "--background-subtle": p.background,
    "--background-muted": p.card,
    "--foreground-secondary": p.foreground,
    "--foreground-muted": p.mutedForeground,
    "--accent-hover": hover,
    "--accent-active": active,
    "--accent-muted": `${p.primary}1f`,
    "--border-accent": `${p.primary}40`,
    "--glow-accent": `0 0 24px rgba(${pr}, ${pg}, ${pb}, 0.35)`,
    "--glow-accent-lg": `0 0 48px rgba(${pr}, ${pg}, ${pb}, 0.4)`,
    "--glow-button": `0 10px 40px -8px color-mix(in srgb, ${p.primary} 85%, transparent)`,
    "--success": p.primary,
    "--success-foreground": primaryFg,
  }

  Object.entries(map).forEach(([k, v]) => root.style.setProperty(k, v))
}

function softMix(a: string, b: string, t: number) {
  return rgbToHex(...mix(hexToRgb(a), hexToRgb(b), t))
}

export function clearCustomCssVars() {
  const root = document.documentElement
  ;[
    "--background",
    "--surface",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--ring",
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-ring",
    "--background-elevated",
    "--background-subtle",
    "--background-muted",
    "--foreground-secondary",
    "--foreground-muted",
    "--accent-hover",
    "--accent-active",
    "--accent-muted",
    "--border-accent",
    "--glow-accent",
    "--glow-accent-lg",
    "--glow-button",
    "--success",
    "--success-foreground",
  ].forEach((k) => root.style.removeProperty(k))
}

export function readStoredCustom(): CustomPalette | null {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CustomPalette
    if (parsed?.kind !== "custom" || parsed.version !== 1) return null
    if (
      !isHexColor(parsed.primary) ||
      !isHexColor(parsed.background) ||
      !isHexColor(parsed.foreground) ||
      !isHexColor(parsed.card) ||
      !isHexColor(parsed.mutedForeground)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function exportPaletteJson(
  palette: CustomPalette,
  pretty = true,
): string {
  return JSON.stringify(palette, null, pretty ? 2 : 0)
}

export function parsePaletteJson(raw: string): CustomPalette | null {
  try {
    const parsed = JSON.parse(raw) as CustomPalette
    if (parsed?.kind !== "custom" || parsed.version !== 1) return null
    const primary = normalizeHex(parsed.primary)
    const background = normalizeHex(parsed.background)
    const foreground = normalizeHex(parsed.foreground)
    const card = normalizeHex(parsed.card)
    const mutedForeground = normalizeHex(parsed.mutedForeground)
    if (!primary || !background || !foreground || !card || !mutedForeground) {
      return null
    }
    return {
      version: 1,
      kind: "custom",
      label: parsed.label ?? "Custom",
      primary,
      background,
      foreground,
      card,
      mutedForeground,
      primaryForeground: parsed.primaryForeground
        ? normalizeHex(parsed.primaryForeground) ?? undefined
        : undefined,
    }
  } catch {
    return null
  }
}
