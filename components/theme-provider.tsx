"use client";

import { useEffect } from "react";
import { DEFAULT_THEME } from "@/lib/theme/color-presets";

/** Keeps html[data-theme] on the active Meteora orange default. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
    try {
      localStorage.removeItem("ys-theme");
    } catch {
      /* ignore */
    }
  }, []);

  return <>{children}</>;
}
