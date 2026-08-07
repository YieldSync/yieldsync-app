/**
 * Saved YieldSync color / liquid presets.
 * Default active theme: orange (Meteora / feurig)
 *
 * - orange  — Meteora / YieldSync live palette (#FF5D00) — default
 * - purple  — MegaCrypt Framer reference (#8B1AFF)
 * - blue    — archived electric blue
 */

export type ThemeId = 'blue' | 'orange' | 'purple'

export type LiquidMotion = {
  seed: number
  speed: number
  scale: number
  amplitude: number
  frequency: number
  definition: number
  bands: number
  amount: number
  grain: number
}

/** RGB 0–1 stops used by the WebGL liquid shader */
export type LiquidStops = {
  dark1: readonly [number, number, number]
  dark2: readonly [number, number, number]
  light1: readonly [number, number, number]
  primary: readonly [number, number, number]
  light2: readonly [number, number, number]
}

export type ThemePreset = {
  id: ThemeId
  label: string
  /** Brand / UI accent hex */
  primary: string
  primaryHover: string
  primaryMuted: string
  chart: [string, string, string, string, string]
  liquidFallback: string
  liquid: LiquidStops
  /** Shared Framer liquid motion (hero settings) */
  motion: LiquidMotion
}

/** Framer Liquid Gradient panel — hero settings (saved) */
export const LIQUID_MOTION_HERO: LiquidMotion = {
  seed: 579,
  speed: 0.38,
  scale: 0.91,
  amplitude: 0.23,
  frequency: 0.1,
  definition: 7,
  bands: 3.8,
  amount: 0.2,
  grain: 0.032,
}

export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
  blue: {
    id: 'blue',
    label: 'Blue',
    primary: '#2F6BFF',
    primaryHover: '#5B8CFF',
    primaryMuted: '#2f6bff1f',
    chart: ['#2F6BFF', '#5B8CFF', '#A8C4FF', '#1A3FA8', '#0B1A40'],
    liquidFallback:
      'bg-[radial-gradient(130%_110%_at_30%_45%,#2f6bff_0%,#1a3fa8_50%,#050812_100%)]',
    liquid: {
      dark1: [0.02, 0.03, 0.08],
      dark2: [0.05, 0.12, 0.38],
      light1: [0.12, 0.32, 0.92],
      primary: [0.184, 0.42, 1.0], // #2F6BFF
      light2: [0.66, 0.78, 1.0],
    },
    motion: LIQUID_MOTION_HERO,
  },

  /** Previous live YieldSync / Meteora orange — preserved */
  orange: {
    id: 'orange',
    label: 'Orange (Meteora)',
    primary: '#FF5D00',
    primaryHover: '#FF8A3D',
    primaryMuted: '#ff5d001f',
    chart: ['#FF5D00', '#FF8A3D', '#FFD28F', '#C44A00', '#5C2200'],
    liquidFallback:
      'bg-[radial-gradient(130%_110%_at_30%_45%,#ff5d00_0%,#c44a00_50%,#1a0c00_100%)]',
    liquid: {
      dark1: [0.04, 0.015, 0.0],
      dark2: [0.28, 0.08, 0.0],
      light1: [0.85, 0.3, 0.0],
      primary: [1.0, 0.365, 0.0], // #FF5D00
      light2: [1.0, 0.82, 0.56],
    },
    motion: LIQUID_MOTION_HERO,
  },

  /** MegaCrypt Framer purple reference — preserved */
  purple: {
    id: 'purple',
    label: 'Purple (MegaCrypt)',
    primary: '#8B1AFF',
    primaryHover: '#B06BFF',
    primaryMuted: '#8b1aff1f',
    chart: ['#8B1AFF', '#B06BFF', '#D4B3FF', '#5A0FAD', '#2C0A52'],
    liquidFallback:
      'bg-[radial-gradient(130%_110%_at_30%_45%,#8b1aff_0%,#5a0fad_50%,#0a0514_100%)]',
    liquid: {
      dark1: [0.04, 0.02, 0.08],
      dark2: [0.22, 0.06, 0.42],
      light1: [0.55, 0.18, 0.95],
      primary: [0.545, 0.102, 1.0], // #8B1AFF
      light2: [0.83, 0.7, 1.0],
    },
    motion: LIQUID_MOTION_HERO,
  },
}

/** Active default for the whole app (CSS + liquid). */
export const DEFAULT_THEME: ThemeId = 'orange'

export function getThemePreset(id: ThemeId = DEFAULT_THEME): ThemePreset {
  return THEME_PRESETS[id] ?? THEME_PRESETS.orange
}
