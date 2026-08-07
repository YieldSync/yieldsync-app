"use client"

import { useTheme, type ColorScheme } from "@/components/theme-provider"

export type { ColorScheme }

/** Light / dark surface mode — keeps the active brand palette (e.g. Moss). */
export function useColorScheme() {
  const { scheme, setScheme, toggleScheme } = useTheme()
  return { scheme, setScheme, toggle: toggleScheme }
}
