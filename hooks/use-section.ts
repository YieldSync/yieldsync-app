"use client"

import { useEffect, useState } from "react"
import { getSectionMeta, isSectionId, type SectionId } from "@/lib/navigation"

function readHash(): SectionId {
  if (typeof window === "undefined") return "dashboard"
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, ""))
  return isSectionId(raw) ? raw : "dashboard"
}

/**
 * Derives the active section from the URL hash so every view swaps
 * client-side without a navigation or full page reload.
 */
export function useSection() {
  const [section, setSection] = useState<SectionId>("dashboard")

  useEffect(() => {
    const sync = () => setSection(readHash())
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  useEffect(() => {
    document.title = `${getSectionMeta(section).title} · YieldSync`
    window.scrollTo({ top: 0 })
  }, [section])

  return section
}
