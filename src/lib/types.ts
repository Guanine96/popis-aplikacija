export type UserRole = "admin" | "popisivac"

export interface AppUser {
  id: string
  username: string
  displayName: string
  role: UserRole
  orgId: string
  isOnline: boolean
  itemsCounted: number
  financialValue: number
  createdAt: string
}

export interface Product {
  sku: string
  barcode: string
  name: string
  expectedQty: number
  price: number
}

export interface CountEntry {
  sku: string
  counterId: string
  quantity: number
  confirmedAt: string
}

export interface InventorySession {
  id: string
  name: string
  location: string
  blind: boolean
  createdAt: string
}

export interface Subscription {
  plan: string
  status: "aktivna" | "probni" | "istekla"
  seatsTotal: number
  renewsOn: string
}

export interface AuthSession {
  userId: string
  username: string
  role: UserRole
}
