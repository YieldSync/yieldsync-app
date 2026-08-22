import { fetchSourcePage, type PortfolioTotals } from "@/lib/meteora/portfolio"
import { fetchDammOpenPositions, fetchDammTotals } from "@/lib/meteora/damm-v2"
import type { WalletPosition, WalletStats } from "@/lib/meteora/types"

function add(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null
  return (a ?? 0) + (b ?? 0)
}

export function sampleFromPositions(rows: WalletPosition[]) {
  const closed = rows.filter((p) => p.isClosed)
  const wins = closed.filter((p) => (p.pnlSol ?? 0) > 0).length
  const invested = closed
    .map((p) => p.investedSol)
    .filter((n): n is number => n != null)
  const fees = closed
    .map((p) => p.feeSol)
    .filter((n): n is number => n != null)
  const pnls = closed
    .map((p) => p.pnlSol)
    .filter((n): n is number => n != null)
  const times = closed
    .map((p) => p.closedAt ?? p.createdAt)
    .filter((n): n is number => n != null && n > 0)
  const spanDays =
    times.length >= 2
      ? (Math.max(...times) - Math.min(...times)) / 86_400
      : 0
  const pnlSum = pnls.reduce((s, n) => s + n, 0)
  return {
    positions: closed.length,
    winRate: closed.length ? (wins / closed.length) * 100 : null,
    avgInvestedSol: invested.length
      ? invested.reduce((s, n) => s + n, 0) / invested.length
      : null,
    feeEarnedSol: fees.length ? fees.reduce((s, n) => s + n, 0) : null,
    pnlSol: pnls.length ? pnlSum : null,
    avgMonthlyPnlSol:
      pnls.length && spanDays >= 1 ? (pnlSum / spanDays) * 30 : pnls.length ? pnlSum : null,
    expectedValueSol: pnls.length ? pnlSum / pnls.length : null,
  }
}

export type WalletStatsPayload = {
  stats: WalletStats
  open: PortfolioTotals
  closedCount: number
}

/**
 * Lightweight wallet-level totals from both APIs. Sampled metrics stay empty
 * here — the UI fills them from the closed-position page it already loads.
 */
export async function loadWalletStats(wallet: string): Promise<WalletStatsPayload> {
  const [dlmmOpen, dlmmClosed, dammOpen, dammTotal] = await Promise.all([
    fetchSourcePage(wallet, "open", 1).catch(() => null),
    fetchSourcePage(wallet, "closed", 1).catch(() => null),
    fetchDammOpenPositions(wallet).catch(() => null),
    fetchDammTotals(wallet).catch(() => null),
  ])

  const open: PortfolioTotals = {
    totalCount:
      (dlmmOpen?.totals.totalCount ?? 0) + (dammOpen ? 1 : 0),
    totalPositions:
      (dlmmOpen?.totals.totalPositions ?? 0) + (dammOpen?.totalPositions ?? 0),
    solPrice: dlmmOpen?.totals.solPrice ?? null,
    balancesSol: add(dlmmOpen?.totals.balancesSol ?? null, dammOpen?.balancesSol ?? null),
    unclaimedFeesSol: add(
      dlmmOpen?.totals.unclaimedFeesSol ?? null,
      dammOpen?.unclaimedFeesSol ?? null,
    ),
    pnlSol: add(dlmmOpen?.totals.pnlSol ?? null, dammOpen?.pnlSol ?? null),
    pnlSolPct: null,
  }

  const closedCount =
    (dlmmClosed?.totals.totalPositions ?? 0) + (dammTotal?.closedPositions ?? 0)

  return {
    open,
    closedCount,
    stats: {
      netWorthSol: open.balancesSol,
      openValueSol: open.balancesSol,
      unclaimedFeeSol: open.unclaimedFeesSol,
      openPnlSol: open.pnlSol,
      closedPositions: closedCount,
      openPositions: open.totalPositions,
      realisedPnlSol: dammTotal?.pnlSol ?? null,
      realisedPnlPct: dammTotal?.pnlSolPct ?? null,
      sampled: {
        positions: 0,
        winRate: null,
        avgInvestedSol: null,
        feeEarnedSol: null,
        pnlSol: null,
        avgMonthlyPnlSol: null,
        expectedValueSol: null,
      },
    },
  }
}
