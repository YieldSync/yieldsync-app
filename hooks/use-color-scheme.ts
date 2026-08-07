"use client"

import { useCallback, useEffect, useState } from "react"

export type ColorScheme = "dark" | "light"

export function useColorScheme() {
  const [scheme, setScheme] = useState<ColorScheme>("dark")

  useEffect(() => {
    setScheme(document.documentElement.classList.contains("light") ? "light" : "dark")
  }, [])

  const toggle = useCallback(() => {
    setScheme((current) => {
      const next: ColorScheme = current === "dark" ? "light" : "dark"
      const root = document.documentElement
      root.classList.toggle("light", next === "light")
      root.classList.toggle("dark", next === "dark")
      root.style.colorScheme = next
      return next
    })
  }, [])

  return { scheme, toggle }
}
