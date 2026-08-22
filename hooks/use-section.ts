"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  getSectionMeta,
  isSectionId,
  pathToSection,
  type SectionId,
} from "@/lib/navigation"

/**
 * Active section from the URL path (`/discover`) with hash fallback
 * (`/dashboard#discover`) for old bookmarks.
 */
export function useSection(): SectionId {
  const pathname = usePathname() || "/dashboard"
  const fromPath = pathToSection(pathname)
  const [hash, setHash] = useState("")

  useEffect(() => {
    const read = () =>
      decodeURIComponent(window.location.hash.replace(/^#/, ""))
    setHash(read())
    const onHash = () => setHash(read())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [pathname])

  const section: SectionId =
    fromPath === "dashboard" && isSectionId(hash) ? hash : fromPath

  useEffect(() => {
    document.title = `${getSectionMeta(section).title} · YieldSync`
    window.scrollTo({ top: 0 })
  }, [section])

  return section
}
