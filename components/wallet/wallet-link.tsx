import Link from "next/link"
import { cn, isValidSolanaAddress, truncateAddress } from "@/lib/utils"

export function WalletLink({
  address,
  className,
  chars = 4,
  children,
}: {
  address: string
  className?: string
  chars?: number
  children?: React.ReactNode
}) {
  const trimmed = address.trim()
  if (!isValidSolanaAddress(trimmed)) {
    return <span className={className}>{children ?? trimmed}</span>
  }
  return (
    <Link
      href={`/wallet/${trimmed}`}
      className={cn(
        "tabular hover:text-foreground hover:underline underline-offset-2",
        className,
      )}
      title={trimmed}
    >
      {children ?? truncateAddress(trimmed, chars)}
    </Link>
  )
}
