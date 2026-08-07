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
} from "@/lib/theme/color-presets"

export const THEME_STORAGE_KEY = "ys-theme"

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return value === "orange" || value === "purple" || value === "blue"
}

export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(raw)) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME
}

export function applyThemeToDocument(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme)
}

type ThemeContextValue = {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  presets: typeof THEME_PRESETS
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Applies brand color preset via html[data-theme] — landing + dashboard. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)

  useEffect(() => {
    const stored = readStoredTheme()
    setThemeState(stored)
    applyThemeToDocument(stored)
  }, [])

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next)
    applyThemeToDocument(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, presets: THEME_PRESETS }),
    [theme, setTheme],
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
