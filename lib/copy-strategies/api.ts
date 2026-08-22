import type { SupabaseClient } from "@supabase/supabase-js"
import { withMigrationHint } from "@/lib/supabase/errors"

const TABLE = "copy_trading_strategies"
const MIGRATION = "20260811200000_strategy_status.sql"

export type SizingMode = "percentage" | "fixed"
export type StrategyStatus = "draft" | "active" | "paused"

export type CopyStrategyRow = {
  id: string
  user_id: string
  name: string
  source_wallet: string
  source_name: string | null
  execution_wallet: string
  execution_label: string | null
  privy_wallet_id: string | null
  copy_pct: number
  min_size_sol: number
  max_size_sol: number | null
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
  min_pool_age_minutes: number | null
  max_pool_age_minutes: number | null
  skip_blacklisted: boolean
  require_freeze_authority_disabled: boolean
  require_verified: boolean
  min_holders: number | null
  min_market_cap_usd: number | null
  max_market_cap_usd: number | null
  min_tvl_usd: number | null
  sol_side_only: boolean
  include_usdc_pools: boolean
  score_trades: boolean
  status: string | null
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
  /** Privy wallet id for backend signing — set when strategy starts. */
  privyWalletId?: string | null
  sizingMode?: SizingMode
  copyPct: number
  fixedSizeSol?: number | null
  minSizeSol: number
  /** null = no per-position SOL cap */
  maxSizeSol?: number | null
  maxPositions?: number
  slippagePct: number
  priorityFeeSol?: number
  stopLossPct?: number | null
  takeProfitPct?: number | null
  tokenWhitelist?: string[]
  tokenBlacklist?: string[]
  autoSell?: boolean
  autoSellRetries?: number
  minPoolAgeMinutes?: number | null
  maxPoolAgeMinutes?: number | null
  skipBlacklisted?: boolean
  requireFreezeAuthorityDisabled?: boolean
  requireVerified?: boolean
  minHolders?: number | null
  minMarketCapUsd?: number | null
  maxMarketCapUsd?: number | null
  minTvlUsd?: number | null
  solSideOnly?: boolean
  includeUsdcPools?: boolean
  scoreTrades?: boolean
  /** draft | active | paused — drives enabled for the backend. */
  status?: StrategyStatus
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

function optNum(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
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

function optInt(v: number | null | undefined): number | null {
  if (v == null) return null
  if (!Number.isFinite(v)) return null
  return Math.max(0, Math.round(v))
}

function optUsd(v: number | null | undefined): number | null {
  if (v == null) return null
  if (!Number.isFinite(v) || v < 0) return null
  return v
}

function normalizeStatus(
  status: unknown,
  enabled: boolean,
): StrategyStatus {
  const s = typeof status === "string" ? status.toLowerCase() : ""
  if (s === "draft" || s === "active" || s === "paused") return s
  return enabled ? "active" : "paused"
}

export function mapCopyStrategy(row: CopyStrategyRow) {
  const enabled = Boolean(row.enabled)
  const status = normalizeStatus(row.status, enabled)
  return {
    id: row.id,
    name: row.name,
    sourceWallet: row.source_wallet,
    sourceName: row.source_name,
    executionWallet: row.execution_wallet,
    executionLabel: row.execution_label,
    privyWalletId: row.privy_wallet_id,
    sizingMode: (row.sizing_mode === "fixed" ? "fixed" : "percentage") as SizingMode,
    copyPct: num(row.copy_pct, 25),
    fixedSizeSol: row.fixed_size_sol == null ? null : num(row.fixed_size_sol),
    minSizeSol: num(row.min_size_sol, 0.1),
    maxSizeSol: row.max_size_sol == null ? null : num(row.max_size_sol),
    maxPositions: num(row.max_positions, 10),
    slippagePct: num(row.slippage_pct, 1.5),
    priorityFeeSol: num(row.priority_fee_sol, 0.0005),
    stopLossPct: row.stop_loss_pct == null ? null : num(row.stop_loss_pct),
    takeProfitPct: row.take_profit_pct == null ? null : num(row.take_profit_pct),
    tokenWhitelist: strArr(row.token_whitelist),
    tokenBlacklist: strArr(row.token_blacklist),
    autoSell: bool(row.auto_sell, true),
    autoSellRetries: num(row.auto_sell_retries, 3),
    minPoolAgeMinutes: optNum(row.min_pool_age_minutes),
    maxPoolAgeMinutes: optNum(row.max_pool_age_minutes),
    skipBlacklisted: bool(row.skip_blacklisted, true),
    requireFreezeAuthorityDisabled: bool(
      row.require_freeze_authority_disabled,
      true,
    ),
    requireVerified: bool(row.require_verified, false),
    minHolders: optNum(row.min_holders),
    minMarketCapUsd: optNum(row.min_market_cap_usd),
    maxMarketCapUsd: optNum(row.max_market_cap_usd),
    minTvlUsd: optNum(row.min_tvl_usd),
    solSideOnly: bool(row.sol_side_only, true),
    includeUsdcPools: bool(row.include_usdc_pools, false),
    scoreTrades: bool(row.score_trades, false),
    status,
    enabled: status === "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type CopyStrategy = ReturnType<typeof mapCopyStrategy>

function resolveStatus(input: CopyStrategyInput): StrategyStatus {
  if (input.status === "draft" || input.status === "active" || input.status === "paused") {
    return input.status
  }
  return input.enabled === false ? "draft" : "active"
}

function toRowPayload(input: CopyStrategyInput) {
  const status = resolveStatus(input)
  const row: Record<string, unknown> = {
    name: input.name.trim().slice(0, 48) || "Strategy",
    source_wallet: input.sourceWallet.trim(),
    source_name: input.sourceName?.trim() || null,
    execution_wallet: input.executionWallet.trim(),
    execution_label: input.executionLabel?.trim() || null,
    sizing_mode: input.sizingMode === "fixed" ? "fixed" : "percentage",
    copy_pct: Math.min(100, Math.max(1, Math.round(input.copyPct))),
    fixed_size_sol: input.fixedSizeSol ?? null,
    min_size_sol: input.minSizeSol,
    max_size_sol: optUsd(input.maxSizeSol),
    max_positions: Math.min(
      100,
      Math.max(1, Math.round(input.maxPositions ?? 10)),
    ),
    slippage_pct: input.slippagePct,
    priority_fee_sol: input.priorityFeeSol ?? 0.0005,
    stop_loss_pct: input.stopLossPct ?? null,
    take_profit_pct: input.takeProfitPct ?? null,
    token_whitelist: input.tokenWhitelist ?? [],
    token_blacklist: input.tokenBlacklist ?? [],
    auto_sell: input.autoSell ?? true,
    auto_sell_retries: Math.min(10, Math.max(0, Math.round(input.autoSellRetries ?? 3))),
    min_pool_age_minutes: optInt(input.minPoolAgeMinutes),
    max_pool_age_minutes: optInt(input.maxPoolAgeMinutes),
    skip_blacklisted: input.skipBlacklisted ?? true,
    require_freeze_authority_disabled:
      input.requireFreezeAuthorityDisabled ?? true,
    require_verified: input.requireVerified ?? false,
    min_holders: optInt(input.minHolders),
    min_market_cap_usd: optUsd(input.minMarketCapUsd),
    max_market_cap_usd: optUsd(input.maxMarketCapUsd),
    min_tvl_usd: optUsd(input.minTvlUsd),
    sol_side_only: input.solSideOnly ?? true,
    include_usdc_pools: input.includeUsdcPools ?? false,
    score_trades: input.scoreTrades ?? false,
    status,
    enabled: status === "active",
  }
  // Only touch Privy id when the caller sets it (avoid wiping on edits).
  if (input.privyWalletId !== undefined) {
    row.privy_wallet_id = input.privyWalletId?.trim() || null
  }
  return row
}

function toInsert(userId: string, input: CopyStrategyInput) {
  return {
    user_id: userId,
    ...toRowPayload(input),
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

export async function updateCopyStrategy(
  supabase: SupabaseClient,
  id: string,
  input: CopyStrategyInput,
): Promise<CopyStrategy> {
  await requireUserId(supabase)
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...toRowPayload(input),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    throw new Error(
      withMigrationHint(errMessage(error, "Failed to update strategy"), MIGRATION),
    )
  }
  return mapCopyStrategy(data as CopyStrategyRow)
}

export async function setCopyStrategyEnabled(
  supabase: SupabaseClient,
  id: string,
  enabled: boolean,
  opts?: { privyWalletId?: string | null },
): Promise<CopyStrategy> {
  const patch: Record<string, unknown> = {
    enabled,
    status: enabled ? "active" : "paused",
  }
  if (opts?.privyWalletId != null) {
    patch.privy_wallet_id = opts.privyWalletId.trim() || null
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw new Error(errMessage(error, "Failed to update strategy"))
  return mapCopyStrategy(data as CopyStrategyRow)
}

/** Pause strategies and clear Privy ids after session signers are revoked. */
export async function revokeExecutionWalletAccess(
  supabase: SupabaseClient,
  executionWallet: string,
): Promise<number> {
  const address = executionWallet.trim()
  if (!address) return 0
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      enabled: false,
      status: "paused",
      privy_wallet_id: null,
    })
    .eq("execution_wallet", address)
    .select("id")

  if (error) {
    throw new Error(errMessage(error, "Failed to pause strategies after revoke"))
  }
  return (data ?? []).length
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

/** Empty string → null; invalid → null. */
export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
