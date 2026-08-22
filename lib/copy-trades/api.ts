import type { SupabaseClient } from "@supabase/supabase-js"
import { withMigrationHint } from "@/lib/supabase/errors"

const EXEC_TABLE = "copy_trade_executions"
const STRAT_TABLE = "copy_trading_strategies"

export type CopyTradeExecutionRow = {
  id: string
  user_id: string | null
  strategy_id: string | null
  pool_address: string | null
  amount_usd: number | null
  status: string
  error_message: string | null
  idempotency_key: string | null
  source_signature: string | null
  user_signature: string | null
  ix_index: number | null
  action: string | null
  protocol: string | null
  latency_ms: number | null
  source_slot: number | null
  user_slot: number | null
  created_at: string
  updated_at: string | null
}

export type CopyTradeExecution = {
  id: string
  strategyId: string | null
  strategyName: string | null
  executionWallet: string | null
  sourceWallet: string | null
  poolAddress: string | null
  amountUsd: number | null
  status: string
  errorMessage: string | null
  sourceSignature: string | null
  userSignature: string | null
  action: string | null
  protocol: string | null
  latencyMs: number | null
  /** Leader TX Solana slot (when backend writes it) */
  sourceSlot: number | null
  /** Copy TX Solana slot (when backend writes it) */
  userSlot: number | null
  createdAt: string
  role: "execution" | "leader" | "both" | "unknown"
}

function errMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "object" && err && "message" in err) {
    const m = (err as { message?: string }).message
    if (m) return m
  }
  return fallback
}

/**
 * Copy-trade executions for strategies where `wallet` is leader and/or execution wallet.
 */
export async function listCopyTradesForWallet(
  supabase: SupabaseClient,
  walletAddress: string,
  limit = 100,
): Promise<CopyTradeExecution[]> {
  const address = walletAddress.trim()
  if (!address) return []

  const { data: strategies, error: stratErr } = await supabase
    .from(STRAT_TABLE)
    .select("id, name, source_wallet, execution_wallet")
    .or(`execution_wallet.eq.${address},source_wallet.eq.${address}`)

  if (stratErr) {
    throw new Error(
      withMigrationHint(
        errMessage(stratErr, "Failed to load strategies for wallet"),
        "20260810160000_strategy_execution_fields.sql",
      ),
    )
  }

  const stratRows = (strategies ?? []) as {
    id: string
    name: string | null
    source_wallet: string
    execution_wallet: string
  }[]

  if (stratRows.length === 0) return []

  const byId = new Map(stratRows.map((s) => [s.id, s]))
  const ids = stratRows.map((s) => s.id)

  const { data, error } = await supabase
    .from(EXEC_TABLE)
    .select("*")
    .in("strategy_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(
      errMessage(error, "Failed to load copy trade executions"),
    )
  }

  return ((data ?? []) as CopyTradeExecutionRow[]).map((row) => {
    const strat = row.strategy_id ? byId.get(row.strategy_id) : undefined
    const isExec =
      strat?.execution_wallet?.toLowerCase() === address.toLowerCase()
    const isLeader =
      strat?.source_wallet?.toLowerCase() === address.toLowerCase()
    const role: CopyTradeExecution["role"] =
      isExec && isLeader
        ? "both"
        : isExec
          ? "execution"
          : isLeader
            ? "leader"
            : "unknown"

    return {
      id: row.id,
      strategyId: row.strategy_id,
      strategyName: strat?.name ?? null,
      executionWallet: strat?.execution_wallet ?? null,
      sourceWallet: strat?.source_wallet ?? null,
      poolAddress: row.pool_address,
      amountUsd: row.amount_usd == null ? null : Number(row.amount_usd),
      status: row.status,
      errorMessage: row.error_message,
      sourceSignature: row.source_signature,
      userSignature: row.user_signature,
      action: row.action,
      protocol: row.protocol,
      latencyMs: row.latency_ms == null ? null : Number(row.latency_ms),
      sourceSlot:
        row.source_slot == null ? null : Number(row.source_slot),
      userSlot: row.user_slot == null ? null : Number(row.user_slot),
      createdAt: row.created_at,
      role,
    }
  })
}

function mapExecRow(
  row: CopyTradeExecutionRow,
  strat?: {
    id: string
    name: string | null
    source_wallet: string
    execution_wallet: string
  },
): CopyTradeExecution {
  return {
    id: row.id,
    strategyId: row.strategy_id,
    strategyName: strat?.name ?? null,
    executionWallet: strat?.execution_wallet ?? null,
    sourceWallet: strat?.source_wallet ?? null,
    poolAddress: row.pool_address,
    amountUsd: row.amount_usd == null ? null : Number(row.amount_usd),
    status: row.status,
    errorMessage: row.error_message,
    sourceSignature: row.source_signature,
    userSignature: row.user_signature,
    action: row.action,
    protocol: row.protocol,
    latencyMs: row.latency_ms == null ? null : Number(row.latency_ms),
    sourceSlot: row.source_slot == null ? null : Number(row.source_slot),
    userSlot: row.user_slot == null ? null : Number(row.user_slot),
    createdAt: row.created_at,
    role: "unknown",
  }
}

/**
 * Copy-trade history for a mirrored position (strategy + optional pool filter).
 */
export async function listCopyTradesForPosition(
  supabase: SupabaseClient,
  opts: {
    strategyId?: string | null
    poolAddress?: string | null
    limit?: number
  },
): Promise<CopyTradeExecution[]> {
  const limit = opts.limit ?? 50
  const strategyId = opts.strategyId?.trim() || null
  const pool = opts.poolAddress?.trim() || null

  if (!strategyId && !pool) return []

  let strat:
    | {
        id: string
        name: string | null
        source_wallet: string
        execution_wallet: string
      }
    | undefined

  if (strategyId) {
    const { data: s } = await supabase
      .from(STRAT_TABLE)
      .select("id, name, source_wallet, execution_wallet")
      .eq("id", strategyId)
      .maybeSingle()
    if (s) {
      strat = s as {
        id: string
        name: string | null
        source_wallet: string
        execution_wallet: string
      }
    }
  }

  let q = supabase
    .from(EXEC_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (strategyId) q = q.eq("strategy_id", strategyId)
  if (pool) q = q.eq("pool_address", pool)

  const { data, error } = await q
  if (error) {
    throw new Error(errMessage(error, "Failed to load position copy trades"))
  }

  return ((data ?? []) as CopyTradeExecutionRow[]).map((row) =>
    mapExecRow(row, strat),
  )
}
