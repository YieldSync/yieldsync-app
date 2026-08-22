const SUB = "₀₁₂₃₄₅₆₇₈₉"

export function formatAge(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "—"
  const hours = seconds / 3600
  if (hours < 1) return `${hours.toFixed(2)}h`
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : hours.toFixed(0)} hours`
  const days = hours / 24
  if (days < 14) return `${days.toFixed(days < 10 ? 1 : 0)}d`
  return `${Math.round(days / 7)}w`
}

export function formatRelative(unix: number | null): string {
  if (!unix) return "—"
  const delta = Math.max(0, Date.now() / 1000 - unix)
  if (delta < 60) return "just now"
  if (delta < 3600) return `${Math.floor(delta / 60)} min ago`
  if (delta < 86_400) {
    const h = Math.floor(delta / 3600)
    return `${h} hour${h === 1 ? "" : "s"} ago`
  }
  const d = Math.floor(delta / 86_400)
  if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`
  return new Date(unix * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })
}

/** Compact token amount, with subscript leading zeros for dust. */
export function formatToken(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  if (value === 0) return "0.00"
  const sign = value < 0 ? "−" : ""
  const abs = Math.abs(value)
  if (abs >= 0.01) {
    const digits = abs < 1000 ? 4 : 2
    return `${sign}${abs.toLocaleString("en-US", { maximumFractionDigits: digits })}`
  }
  const fixed = abs.toFixed(12)
  const match = fixed.match(/^0\.(0+)([1-9]\d*)/)
  if (!match) return `${sign}${abs.toExponential(2)}`
  const zeros = match[1].length
  const rest = match[2].slice(0, 4)
  const sub = String(zeros)
    .split("")
    .map((c) => SUB[Number(c)] ?? c)
    .join("")
  return `${sign}0.0${sub}${rest}`
}

export function formatSolCompact(value: number | null, opts: { signed?: boolean } = {}) {
  if (value == null || !Number.isFinite(value)) return "—"
  if (Math.abs(value) > 0 && Math.abs(value) < 0.01) {
    const sign = opts.signed ? (value > 0 ? "+" : "−") : value < 0 ? "−" : ""
    return `${sign}< 0.01`
  }
  const abs = Math.abs(value)
  const digits = abs === 0 ? 2 : abs < 1 ? 4 : 4
  const text = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
  const sign = opts.signed && value !== 0 ? (value > 0 ? "+" : "−") : value < 0 ? "−" : ""
  return `${sign}${text}`
}

export function ratioPct(part: number | null, whole: number | null): number | null {
  if (part == null || whole == null || whole === 0) return null
  return (part / whole) * 100
}
