import type { Metadata } from "next"
import { DashboardFrame } from "@/components/dashboard/dashboard-frame"
import { WalletDetail } from "@/components/wallet/wallet-detail"
import { isValidSolanaAddress, truncateAddress } from "@/lib/utils"

type Props = { params: Promise<{ address: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params
  const wallet = decodeURIComponent(address || "").trim()
  const label = isValidSolanaAddress(wallet)
    ? truncateAddress(wallet, 4)
    : "Wallet"
  return {
    title: label,
    description: `Open/closed positions and copy trades for ${label}`,
  }
}

export default async function WalletPage({ params }: Props) {
  const { address } = await params
  const wallet = decodeURIComponent(address || "").trim()
  return (
    <DashboardFrame active="discover">
      <WalletDetail address={wallet} />
    </DashboardFrame>
  )
}
