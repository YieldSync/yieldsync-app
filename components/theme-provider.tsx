"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  type ThemeId,
  type ThemePreset,
} from "@/lib/theme/color-presets"
import {
  applyCustomCssVars,
  clearCustomCssVars,
  CUSTOM_STORAGE_KEY,
  customToPreset,
  DEFAULT_CUSTOM_PALETTE,
  readStoredCustom,
  type CustomPalette,
} from "@/lib/theme/custom-palette"

export const THEME_STORAGE_KEY = "ys-brand-theme"

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return (
    value === "moss" ||
    value === "orange" ||
    value === "purple" ||
    value === "blue"
  )
}

export type ThemeMode = "preset" | "custom"

type ThemeContextValue = {
  mode: ThemeMode
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  custom: CustomPalette
  setCustom: (palette: CustomPalette) => void
  enableCustom: () => void
  activePreset: ThemePreset
  presets: typeof THEME_PRESETS
  exportJson: string
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyPresetTheme(theme: ThemeId) {
  clearCustomCssVars()
  document.documentElement.setAttribute("data-theme", theme)
}

function applyCustomTheme(palette: CustomPalette) {
  document.documentElement.setAttribute("data-theme", "moss")
  applyCustomCssVars(palette)
}

/** Brand colors for landing + dashboard (presets or custom). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("preset")
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)
  const [custom, setCustomState] = useState<CustomPalette>(DEFAULT_CUSTOM_PALETTE)

  useEffect(() => {
    try {
      const modeRaw = localStorage.getItem(`${THEME_STORAGE_KEY}-mode`)
      const storedCustom = readStoredCustom()
      if (storedCustom) setCustomState(storedCustom)

      if (modeRaw === "custom" && storedCustom) {
        setMode("custom")
        applyCustomTheme(storedCustom)
        return
      }

      const raw = localStorage.getItem(THEME_STORAGE_KEY)
      const next = isThemeId(raw) ? raw : DEFAULT_THEME
      setMode("preset")
      setThemeState(next)
      applyPresetTheme(next)
    } catch {
      applyPresetTheme(DEFAULT_THEME)
    }
  }, [])

  const setTheme = useCallback((next: ThemeId) => {
    setMode("preset")
    setThemeState(next)
    applyPresetTheme(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
      localStorage.setItem(`${THEME_STORAGE_KEY}-mode`, "preset")
    } catch {
      /* ignore */
    }
  }, [])

  const setCustom = useCallback((palette: CustomPalette) => {
    setCustomState(palette)
    setMode("custom")
    applyCustomTheme(palette)
    try {
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(palette))
      localStorage.setItem(`${THEME_STORAGE_KEY}-mode`, "custom")
    } catch {
      /* ignore */
    }
  }, [])

  const enableCustom = useCallback(() => {
    setCustom(custom)
  }, [custom, setCustom])

  const activePreset = useMemo(
    () => (mode === "custom" ? customToPreset(custom) : THEME_PRESETS[theme]),
    [mode, custom, theme],
  )

  const exportJson = useMemo(
    () =>
      JSON.stringify(
        mode === "custom"
          ? custom
          : {
              version: 1,
              kind: "preset",
              id: theme,
              label: THEME_PRESETS[theme].label,
              primary: THEME_PRESETS[theme].primary,
              note: "Preset — switch to Custom in Appearance to edit hex values.",
            },
        null,
        2,
      ),
    [mode, custom, theme],
  )

  const value = useMemo(
    () => ({
      mode,
      theme,
      setTheme,
      custom,
      setCustom,
      enableCustom,
      activePreset,
      presets: THEME_PRESETS,
      exportJson,
    }),
    [
      mode,
      theme,
      setTheme,
      custom,
      setCustom,
      enableCustom,
      activePreset,
      exportJson,
    ],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return ctx
}
