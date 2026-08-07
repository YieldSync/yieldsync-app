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
export const SCHEME_STORAGE_KEY = "ys-color-scheme"

export type ColorScheme = "dark" | "light"
export type ThemeMode = "preset" | "custom"

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return (
    value === "moss" ||
    value === "orange" ||
    value === "purple" ||
    value === "blue"
  )
}

type ThemeContextValue = {
  mode: ThemeMode
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  scheme: ColorScheme
  setScheme: (scheme: ColorScheme) => void
  toggleScheme: () => void
  custom: CustomPalette
  setCustom: (palette: CustomPalette) => void
  enableCustom: () => void
  activePreset: ThemePreset
  presets: typeof THEME_PRESETS
  exportJson: string
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applySchemeClass(scheme: ColorScheme) {
  const root = document.documentElement
  root.classList.toggle("light", scheme === "light")
  root.classList.toggle("dark", scheme === "dark")
  root.style.colorScheme = scheme
}

function applyPresetTheme(theme: ThemeId, scheme: ColorScheme) {
  clearCustomCssVars()
  document.documentElement.setAttribute("data-theme", theme)
  applySchemeClass(scheme)
}

function applyCustomTheme(palette: CustomPalette, scheme: ColorScheme) {
  document.documentElement.setAttribute("data-theme", "moss")
  applySchemeClass(scheme)
  applyCustomCssVars(palette, scheme)
}

/** Brand colors + light/dark for landing + dashboard. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("preset")
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)
  const [scheme, setSchemeState] = useState<ColorScheme>("dark")
  const [custom, setCustomState] = useState<CustomPalette>(DEFAULT_CUSTOM_PALETTE)

  useEffect(() => {
    try {
      const schemeRaw = localStorage.getItem(SCHEME_STORAGE_KEY)
      const nextScheme: ColorScheme =
        schemeRaw === "light" || schemeRaw === "dark" ? schemeRaw : "dark"
      setSchemeState(nextScheme)

      const modeRaw = localStorage.getItem(`${THEME_STORAGE_KEY}-mode`)
      const storedCustom = readStoredCustom()
      if (storedCustom) setCustomState(storedCustom)

      if (modeRaw === "custom" && storedCustom) {
        setMode("custom")
        applyCustomTheme(storedCustom, nextScheme)
        return
      }

      const raw = localStorage.getItem(THEME_STORAGE_KEY)
      // Prefer explicit moss default when nothing stored
      const next = isThemeId(raw) ? raw : DEFAULT_THEME
      setMode("preset")
      setThemeState(next)
      applyPresetTheme(next, nextScheme)
    } catch {
      applyPresetTheme(DEFAULT_THEME, "dark")
    }
  }, [])

  const setScheme = useCallback(
    (next: ColorScheme) => {
      setSchemeState(next)
      try {
        localStorage.setItem(SCHEME_STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      if (mode === "custom") {
        applyCustomTheme(custom, next)
      } else {
        applyPresetTheme(theme, next)
      }
    },
    [mode, custom, theme],
  )

  const toggleScheme = useCallback(() => {
    setScheme(scheme === "dark" ? "light" : "dark")
  }, [scheme, setScheme])

  const setTheme = useCallback(
    (next: ThemeId) => {
      setMode("preset")
      setThemeState(next)
      applyPresetTheme(next, scheme)
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
        localStorage.setItem(`${THEME_STORAGE_KEY}-mode`, "preset")
      } catch {
        /* ignore */
      }
    },
    [scheme],
  )

  const setCustom = useCallback(
    (palette: CustomPalette) => {
      setCustomState(palette)
      setMode("custom")
      applyCustomTheme(palette, scheme)
      try {
        localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(palette))
        localStorage.setItem(`${THEME_STORAGE_KEY}-mode`, "custom")
      } catch {
        /* ignore */
      }
    },
    [scheme],
  )

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
          ? { ...custom, colorScheme: scheme }
          : {
              version: 1,
              kind: "preset",
              id: theme,
              label: THEME_PRESETS[theme].label,
              primary: THEME_PRESETS[theme].primary,
              colorScheme: scheme,
              note: "Preset — switch to Custom in Appearance to edit hex values.",
            },
        null,
        2,
      ),
    [mode, custom, theme, scheme],
  )

  const value = useMemo(
    () => ({
      mode,
      theme,
      setTheme,
      scheme,
      setScheme,
      toggleScheme,
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
      scheme,
      setScheme,
      toggleScheme,
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
