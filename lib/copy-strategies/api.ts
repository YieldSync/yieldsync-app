import type { SupabaseClient } from "@supabase/supabase-js"
import { withMigrationHint } from "@/lib/supabase/errors"

const TABLE = "copy_trading_strategies"
const MIGRATION = "20260810160000_strategy_execution_fields.sql"

export type SizingMode = "percentage" | "fixed"

export type CopyStrategyRow = {
  id: string
  user_id: string
  name: string
  source_wallet: string
  source_name: string | null
  execution_wallet: string
  execution_label: string | null
  copy_pct: number
  min_size_sol: number
  max_size_sol: number
  max_positions: number
  sizing_mode: SizingMode
  fixed_size_sol: number | null
  slippage_pct: number
  priority_fee_sol: number
  stop_loss_pct: number | null
  take_profit_pct: number | null
  token_whitelist: string[] | null
  token_blacklist: string[] | null
  auto_sell: boolean
  auto_sell_retries: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export type CopyStrategyInput = {
  name: string
  sourceWallet: string
  sourceName?: string | null
  executionWallet: string
  executionLabel?: string | null
  sizingMode?: SizingMode
  copyPct: number
  fixedSizeSol?: number | null
  minSizeSol: number
  maxSizeSol: number
  maxPositions?: number
  slippagePct: number
  priorityFeeSol?: number
  stopLossPct?: number | null
  takeProfitPct?: number | null
  tokenWhitelist?: string[]
  tokenBlacklist?: string[]
  autoSell?: boolean
  autoSellRetries?: number
  enabled?: boolean
}

function errMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "object" && err && "message" in err) {
    const m = (err as { message?: string }).message
    if (m) return m
  }
  return fallback
}

function num(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function bool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v
  if (v == null) return fallback
  return Boolean(v)
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean)
  }
  return []
}

export function mapCopyStrategy(row: CopyStrategyRow) {
  return {
    id: row.id,
    name: row.name,
    sourceWallet: row.source_wallet,
    sourceName: row.source_name,
    executionWallet: row.execution_wallet,
    executionLabel: row.execution_label,
    sizingMode: (row.sizing_mode === "fixed" ? "fixed" : "percentage") as SizingMode,
    copyPct: num(row.copy_pct, 25),
    fixedSizeSol: row.fixed_size_sol == null ? null : num(row.fixed_size_sol),
    minSizeSol: num(row.min_size_sol, 0.1),
    maxSizeSol: num(row.max_size_sol, 2),
    maxPositions: num(row.max_positions, 5),
    slippagePct: num(row.slippage_pct, 1.5),
    priorityFeeSol: num(row.priority_fee_sol, 0.0005),
    stopLossPct: row.stop_loss_pct == null ? null : num(row.stop_loss_pct),
    takeProfitPct: row.take_profit_pct == null ? null : num(row.take_profit_pct),
    tokenWhitelist: strArr(row.token_whitelist),
    tokenBlacklist: strArr(row.token_blacklist),
    autoSell: bool(row.auto_sell, true),
    autoSellRetries: num(row.auto_sell_retries, 3),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type CopyStrategy = ReturnType<typeof mapCopyStrategy>

function toInsert(userId: string, input: CopyStrategyInput) {
  return {
    user_id: userId,
    name: input.name.trim().slice(0, 48) || "Strategy",
    source_wallet: input.sourceWallet.trim(),
    source_name: input.sourceName?.trim() || null,
    execution_wallet: input.executionWallet.trim(),
    execution_label: input.executionLabel?.trim() || null,
    sizing_mode: input.sizingMode === "fixed" ? "fixed" : "percentage",
    copy_pct: Math.min(100, Math.max(1, Math.round(input.copyPct))),
    fixed_size_sol: input.fixedSizeSol ?? null,
    min_size_sol: input.minSizeSol,
    max_size_sol: input.maxSizeSol,
    max_positions: input.maxPositions ?? 5,
    slippage_pct: input.slippagePct,
    priority_fee_sol: input.priorityFeeSol ?? 0.0005,
    stop_loss_pct: input.stopLossPct ?? null,
    take_profit_pct: input.takeProfitPct ?? null,
    token_whitelist: input.tokenWhitelist ?? [],
    token_blacklist: input.tokenBlacklist ?? [],
    auto_sell: input.autoSell ?? true,
    auto_sell_retries: Math.min(10, Math.max(0, Math.round(input.autoSellRetries ?? 3))),
    enabled: input.enabled ?? true,
  }
}

async function requireUserId(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Sign in required")
  return user.id
}

export async function listCopyStrategies(
  supabase: SupabaseClient,
): Promise<CopyStrategy[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(
      withMigrationHint(errMessage(error, "Failed to load strategies"), MIGRATION),
    )
  }
  return ((data ?? []) as CopyStrategyRow[]).map(mapCopyStrategy)
}

export async function createCopyStrategy(
  supabase: SupabaseClient,
  input: CopyStrategyInput,
): Promise<CopyStrategy> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from(TABLE)
    .insert(toInsert(userId, input))
    .select("*")
    .single()

  if (error) {
    throw new Error(
      withMigrationHint(errMessage(error, "Failed to create strategy"), MIGRATION),
    )
  }
  return mapCopyStrategy(data as CopyStrategyRow)
}

export async function setCopyStrategyEnabled(
  supabase: SupabaseClient,
  id: string,
  enabled: boolean,
): Promise<CopyStrategy> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ enabled })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw new Error(errMessage(error, "Failed to update strategy"))
  return mapCopyStrategy(data as CopyStrategyRow)
}

export async function deleteCopyStrategy(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) throw new Error(errMessage(error, "Failed to delete strategy"))
}

export function parseTokenList(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
}
