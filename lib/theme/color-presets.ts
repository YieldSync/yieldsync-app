/**
 * YieldSync color / liquid presets.
 * Default: moss (green / gray / near-black)
 *
 * - moss    — green–gray–black (default)
 * - orange  — Meteora (#FF5D00)
 * - purple  — MegaCrypt Framer (#8B1AFF)
 * - blue    — archived electric blue
 */

export type ThemeId = 'moss' | 'blue' | 'orange' | 'purple'

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

function mix01(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

/**
 * Light scheme: invert the fluid — mostly white / soft mint instead of near-black.
 */
export function liquidStopsForScheme(
  stops: LiquidStops,
  scheme: 'dark' | 'light',
): LiquidStops {
  if (scheme === 'dark') return stops
  const white: [number, number, number] = [0.99, 0.995, 0.99]
  const mist: [number, number, number] = [0.94, 0.97, 0.95]
  return {
    dark1: mix01(white, stops.light2, 0.06),
    dark2: mix01(mist, stops.primary, 0.1),
    light1: mix01(stops.light2, stops.primary, 0.28),
    primary: mix01(stops.primary, white, 0.42),
    light2: mix01(white, stops.light2, 0.22),
  }
}

export function liquidFallbackForScheme(
  preset: ThemePreset,
  scheme: 'dark' | 'light',
): string {
  if (scheme === 'dark') return preset.liquidFallback
  const soft = preset.chart[2] ?? preset.primaryHover
  return `bg-[radial-gradient(130%_110%_at_30%_45%,${soft}_0%,#eef6f0_48%,#ffffff_100%)]`
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
  /** Green / cool gray / near-black — default */
  moss: {
    id: 'moss',
    label: 'Moss',
    primary: '#3DDC84',
    primaryHover: '#6EE7A0',
    primaryMuted: '#3ddc841f',
    chart: ['#3DDC84', '#6EE7A0', '#A7F3C5', '#1F9A56', '#0A2E1A'],
    liquidFallback:
      'bg-[radial-gradient(130%_110%_at_30%_45%,#3ddc84_0%,#1a4d32_42%,#050605_100%)]',
    liquid: {
      dark1: [0.02, 0.025, 0.022],
      dark2: [0.06, 0.14, 0.09],
      light1: [0.12, 0.42, 0.26],
      primary: [0.239, 0.863, 0.518], // #3DDC84
      light2: [0.72, 0.9, 0.78],
    },
    motion: LIQUID_MOTION_HERO,
  },

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
      primary: [0.184, 0.42, 1.0],
      light2: [0.66, 0.78, 1.0],
    },
    motion: LIQUID_MOTION_HERO,
  },

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
      primary: [1.0, 0.365, 0.0],
      light2: [1.0, 0.82, 0.56],
    },
    motion: LIQUID_MOTION_HERO,
  },

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
      primary: [0.545, 0.102, 1.0],
      light2: [0.83, 0.7, 1.0],
    },
    motion: LIQUID_MOTION_HERO,
  },
}

/** Active default for the whole app (CSS + liquid). */
export const DEFAULT_THEME: ThemeId = 'moss'

export function getThemePreset(id: ThemeId = DEFAULT_THEME): ThemePreset {
  return THEME_PRESETS[id] ?? THEME_PRESETS.moss
}
