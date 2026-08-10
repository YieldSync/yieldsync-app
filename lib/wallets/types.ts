export type WalletListStatus = "active" | "archived"

export type WalletList = {
  id: string
  user_id: string
  name: string
  status: WalletListStatus
  color: string | null
  created_at: string
  updated_at: string
  wallet_count?: number
}

export type Wallet = {
  id: string
  user_id: string
  address: string
  name: string | null
  notes: string | null
  status: string
  created_at: string
  lists?: Pick<WalletList, "id" | "name" | "status">[]
}
