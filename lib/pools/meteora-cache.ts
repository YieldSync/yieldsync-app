import type { SupabaseClient } from "@supabase/supabase-js"
import { withMigrationHint } from "@/lib/supabase/errors"

const TABLE = "meteora_dlmm_pools"
const MIGRATION = "20260813190000_meteora_dlmm_pools_cache.sql"
const METEORA_POOL_URL = "https://dlmm.datapi.meteora.ag/pools"
const DEXSCREENER_TOKENS_URL =
  "https://api.dexscreener.com/latest/dex/tokens"

/** Refresh remote metadata when cache is older than this. */
export const POOL_CACHE_TTL_MS = 6 * 60 * 60 * 1000

export type CachedDlmmPool = {
  address: string
  name: string | null
  protocol: string
  createdAtMs: number | null
  isBlacklisted: boolean
  tvl: number | null
  currentPrice: number | null
  apr: number | null
  apy: number | null
  dynamicFeePct: number | null
  binStep: number | null
  baseFeePct: number | null
  maxFeePct: number | null
  protocolFeePct: number | null
  collectFeeMode: number | null
  tokenX: PoolTokenMeta
  tokenY: PoolTokenMeta
  fetchedAt: string
  stale: boolean
}

export type PoolTokenMeta = {
  address: string | null
  symbol: string | null
  name: string | null
  decimals: number | null
  isVerified: boolean
  freezeAuthorityDisabled: boolean
  holders: number | null
  imageUrl: string | null
}

type DbRow = {
  address: string
  name: string | null
  protocol: string | null
  created_at_ms: number | null
  is_blacklisted: boolean | null
  tvl: number | string | null
  current_price: number | string | null
  apr: number | string | null
  apy: number | string | null
  dynamic_fee_pct: number | string | null
  bin_step: number | null
  base_fee_pct: number | string | null
  max_fee_pct: number | string | null
  protocol_fee_pct: number | string | null
  collect_fee_mode: number | null
  token_x_address: string | null
  token_x_symbol: string | null
  token_x_name: string | null
  token_x_decimals: number | null
  token_x_is_verified: boolean | null
  token_x_freeze_disabled: boolean | null
  token_x_holders: number | null
  token_x_image_url: string | null
  token_y_address: string | null
  token_y_symbol: string | null
  token_y_name: string | null
  token_y_decimals: number | null
  token_y_is_verified: boolean | null
  token_y_freeze_disabled: boolean | null
  token_y_holders: number | null
  token_y_image_url: string | null
  fetched_at: string
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function mapRow(row: DbRow, now = Date.now()): CachedDlmmPool {
  const fetched = Date.parse(row.fetched_at)
  const stale =
    !Number.isFinite(fetched) || now - fetched > POOL_CACHE_TTL_MS
  return {
    address: row.address,
    name: row.name,
    protocol: row.protocol || "dlmm",
    createdAtMs: row.created_at_ms,
    isBlacklisted: Boolean(row.is_blacklisted),
    tvl: num(row.tvl),
    currentPrice: num(row.current_price),
    apr: num(row.apr),
    apy: num(row.apy),
    dynamicFeePct: num(row.dynamic_fee_pct),
    binStep: row.bin_step,
    baseFeePct: num(row.base_fee_pct),
    maxFeePct: num(row.max_fee_pct),
    protocolFeePct: num(row.protocol_fee_pct),
    collectFeeMode: row.collect_fee_mode,
    tokenX: {
      address: row.token_x_address,
      symbol: row.token_x_symbol,
      name: row.token_x_name,
      decimals: row.token_x_decimals,
      isVerified: Boolean(row.token_x_is_verified),
      freezeAuthorityDisabled: Boolean(row.token_x_freeze_disabled),
      holders: row.token_x_holders,
      imageUrl: row.token_x_image_url,
    },
    tokenY: {
      address: row.token_y_address,
      symbol: row.token_y_symbol,
      name: row.token_y_name,
      decimals: row.token_y_decimals,
      isVerified: Boolean(row.token_y_is_verified),
      freezeAuthorityDisabled: Boolean(row.token_y_freeze_disabled),
      holders: row.token_y_holders,
      imageUrl: row.token_y_image_url,
    },
    fetchedAt: row.fetched_at,
    stale,
  }
}

function dexscreenerFallbackUrl(mint: string) {
  return `https://cdn.dexscreener.com/tokens/solana/${mint}.png`
}

async function fetchDexScreenerImage(mint: string): Promise<string | null> {
  const address = mint.trim()
  if (!address) return null
  try {
    const res = await fetch(`${DEXSCREENER_TOKENS_URL}/${address}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return dexscreenerFallbackUrl(address)
    const json = (await res.json()) as {
      pairs?: Array<{
        chainId?: string
        info?: { imageUrl?: string }
        baseToken?: { address?: string }
        quoteToken?: { address?: string }
      }>
    }
    const pairs = json.pairs ?? []
    const solana = pairs.filter((p) => p.chainId === "solana")
    const pool = solana.find((p) => p.info?.imageUrl) ?? pairs.find((p) => p.info?.imageUrl)
    if (pool?.info?.imageUrl) return pool.info.imageUrl
    return dexscreenerFallbackUrl(address)
  } catch {
    return dexscreenerFallbackUrl(address)
  }
}

type MeteoraPoolJson = {
  address?: string
  name?: string
  created_at?: number
  is_blacklisted?: boolean
  tvl?: number
  current_price?: number
  apr?: number
  apy?: number
  dynamic_fee_pct?: number
  pool_config?: {
    bin_step?: number
    base_fee_pct?: number
    max_fee_pct?: number
    protocol_fee_pct?: number
    collect_fee_mode?: number
  }
  token_x?: {
    address?: string
    name?: string
    symbol?: string
    decimals?: number
    is_verified?: boolean
    freeze_authority_disabled?: boolean
    holders?: number
  }
  token_y?: {
    address?: string
    name?: string
    symbol?: string
    decimals?: number
    is_verified?: boolean
    freeze_authority_disabled?: boolean
    holders?: number
  }
}

async function fetchMeteoraPool(address: string): Promise<MeteoraPoolJson | null> {
  const res = await fetch(`${METEORA_POOL_URL}/${encodeURIComponent(address)}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 0 },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Meteora pool fetch failed (${res.status})`)
  }
  return (await res.json()) as MeteoraPoolJson
}

function toUpsertRow(
  address: string,
  pool: MeteoraPoolJson,
  images: { x: string | null; y: string | null },
) {
  const cfg = pool.pool_config ?? {}
  const x = pool.token_x ?? {}
  const y = pool.token_y ?? {}
  const now = new Date().toISOString()
  return {
    address,
    name: pool.name ?? null,
    protocol: "dlmm",
    created_at_ms: typeof pool.created_at === "number" ? pool.created_at : null,
    is_blacklisted: Boolean(pool.is_blacklisted),
    tvl: pool.tvl ?? null,
    current_price: pool.current_price ?? null,
    apr: pool.apr ?? null,
    apy: pool.apy ?? null,
    dynamic_fee_pct: pool.dynamic_fee_pct ?? null,
    bin_step: cfg.bin_step ?? null,
    base_fee_pct: cfg.base_fee_pct ?? null,
    max_fee_pct: cfg.max_fee_pct ?? null,
    protocol_fee_pct: cfg.protocol_fee_pct ?? null,
    collect_fee_mode: cfg.collect_fee_mode ?? null,
    token_x_address: x.address ?? null,
    token_x_symbol: x.symbol ?? null,
    token_x_name: x.name ?? null,
    token_x_decimals: x.decimals ?? null,
    token_x_is_verified: Boolean(x.is_verified),
    token_x_freeze_disabled: Boolean(x.freeze_authority_disabled),
    token_x_holders: x.holders ?? null,
    token_x_image_url: images.x,
    token_y_address: y.address ?? null,
    token_y_symbol: y.symbol ?? null,
    token_y_name: y.name ?? null,
    token_y_decimals: y.decimals ?? null,
    token_y_is_verified: Boolean(y.is_verified),
    token_y_freeze_disabled: Boolean(y.freeze_authority_disabled),
    token_y_holders: y.holders ?? null,
    token_y_image_url: images.y,
    raw: pool,
    fetched_at: now,
    updated_at: now,
  }
}

export async function listCachedPools(
  supabase: SupabaseClient,
  addresses: string[],
): Promise<Map<string, CachedDlmmPool>> {
  const unique = [...new Set(addresses.map((a) => a.trim()).filter(Boolean))]
  const out = new Map<string, CachedDlmmPool>()
  if (!unique.length) return out

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("address", unique)

  if (error) {
    throw new Error(
      withMigrationHint(error.message || "Failed to read pool cache", MIGRATION),
    )
  }
  const now = Date.now()
  for (const row of (data ?? []) as DbRow[]) {
    out.set(row.address, mapRow(row, now))
  }
  return out
}

export async function refreshAndCachePool(
  supabase: SupabaseClient,
  address: string,
): Promise<CachedDlmmPool | null> {
  const pool = await fetchMeteoraPool(address)
  if (!pool) return null

  const xMint = pool.token_x?.address ?? ""
  const yMint = pool.token_y?.address ?? ""
  const [xImg, yImg] = await Promise.all([
    xMint ? fetchDexScreenerImage(xMint) : Promise.resolve(null),
    yMint ? fetchDexScreenerImage(yMint) : Promise.resolve(null),
  ])

  const row = toUpsertRow(address, pool, { x: xImg, y: yImg })
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: "address" })
    .select("*")
    .single()

  if (error) {
    throw new Error(
      withMigrationHint(error.message || "Failed to write pool cache", MIGRATION),
    )
  }
  return mapRow(data as DbRow)
}

/**
 * Return cached pools; refresh missing/stale addresses from Meteora + DexScreener.
 * Concurrency limited to avoid hammering upstream APIs.
 */
export async function enrichPools(
  supabase: SupabaseClient,
  addresses: string[],
  opts?: { force?: boolean; concurrency?: number },
): Promise<Record<string, CachedDlmmPool>> {
  const unique = [...new Set(addresses.map((a) => a.trim()).filter(Boolean))]
  const cached = await listCachedPools(supabase, unique)
  const need = unique.filter((a) => {
    const hit = cached.get(a)
    if (!hit) return true
    if (opts?.force) return true
    return hit.stale
  })

  const concurrency = Math.max(1, Math.min(opts?.concurrency ?? 3, 6))
  for (let i = 0; i < need.length; i += concurrency) {
    const chunk = need.slice(i, i + concurrency)
    await Promise.all(
      chunk.map(async (address) => {
        try {
          const fresh = await refreshAndCachePool(supabase, address)
          if (fresh) cached.set(address, fresh)
        } catch (err) {
          console.warn("[pools] enrich failed", address, err)
        }
      }),
    )
  }

  const result: Record<string, CachedDlmmPool> = {}
  for (const address of unique) {
    const hit = cached.get(address)
    if (hit) result[address] = hit
  }
  return result
}

export function formatPoolAge(createdAtMs?: number | null) {
  if (createdAtMs == null || !Number.isFinite(createdAtMs)) return "—"
  // Meteora returns ms; tolerate seconds.
  const ms = createdAtMs < 1e12 ? createdAtMs * 1000 : createdAtMs
  const days = Math.floor((Date.now() - ms) / 86_400_000)
  if (days < 1) return "<1d"
  if (days === 1) return "1d"
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}
