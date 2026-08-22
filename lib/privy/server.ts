/**
 * Server-only Privy REST helpers (Basic Auth with app id + secret).
 * Never import from client components.
 */

export type PrivyAdditionalSigner = {
  signerId: string
  policyIds: string[]
}

export type PrivyWalletPermissions = {
  walletId: string
  address: string
  additionalSigners: PrivyAdditionalSigner[]
  /** True when NEXT_PUBLIC_PRIVY_SIGNER_ID is among additional_signers. */
  yieldsyncGranted: boolean
  yieldsyncSignerId: string | null
}

function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "")
}

export function getPrivyServerConfig() {
  const appId =
    clean(process.env.PRIVY_APP_ID) || clean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)
  const appSecret = clean(process.env.PRIVY_APP_SECRET)
  const apiBase = (
    clean(process.env.PRIVY_API_BASE) || "https://api.privy.io"
  ).replace(/\/$/, "")
  const yieldsyncSignerId =
    clean(process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID) || null

  if (!appId || !appSecret) {
    return null
  }
  return { appId, appSecret, apiBase, yieldsyncSignerId }
}

function authHeader(appId: string, appSecret: string) {
  const token = Buffer.from(`${appId}:${appSecret}`).toString("base64")
  return `Basic ${token}`
}

function mapSigners(raw: unknown): PrivyAdditionalSigner[] {
  if (!Array.isArray(raw)) return []
  const out: PrivyAdditionalSigner[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    const signerId =
      (typeof row.signer_id === "string" && row.signer_id) ||
      (typeof row.signerId === "string" && row.signerId) ||
      ""
    if (!signerId) continue
    const policies =
      (Array.isArray(row.override_policy_ids) && row.override_policy_ids) ||
      (Array.isArray(row.overridePolicyIds) && row.overridePolicyIds) ||
      (Array.isArray(row.policy_ids) && row.policy_ids) ||
      []
    out.push({
      signerId,
      policyIds: policies.map((p) => String(p)).filter(Boolean),
    })
  }
  return out
}

/** GET /v1/wallets/{wallet_id} — returns YieldSync signer grant status. */
export async function fetchPrivyWalletPermissions(
  walletId: string,
): Promise<PrivyWalletPermissions> {
  const cfg = getPrivyServerConfig()
  if (!cfg) {
    throw new Error(
      "Privy server credentials missing. Set PRIVY_APP_ID and PRIVY_APP_SECRET.",
    )
  }
  const id = walletId.trim()
  if (!id) throw new Error("walletId required")

  const res = await fetch(`${cfg.apiBase}/v1/wallets/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      Authorization: authHeader(cfg.appId, cfg.appSecret),
      "privy-app-id": cfg.appId,
      "Content-Type": "application/json",
      // Some edges reject non-browser default agents
      "User-Agent": "YieldSync/1.0 (+https://yieldsync.io)",
    },
    cache: "no-store",
  })

  const json = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  if (!res.ok) {
    const msg =
      (json && typeof json.error === "string" && json.error) ||
      (json && typeof json.message === "string" && json.message) ||
      `Privy wallet lookup failed (${res.status})`
    throw new Error(msg)
  }

  const additionalSigners = mapSigners(json?.additional_signers)
  const yieldsyncSignerId = cfg.yieldsyncSignerId
  const yieldsyncGranted = Boolean(
    yieldsyncSignerId &&
      additionalSigners.some((s) => s.signerId === yieldsyncSignerId),
  )

  return {
    walletId: id,
    address: typeof json?.address === "string" ? json.address : "",
    additionalSigners,
    yieldsyncGranted,
    yieldsyncSignerId,
  }
}
