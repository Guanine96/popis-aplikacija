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
  price: number
}

export interface PopisnaLine {
  sku: string
  name: string
  barcode: string
  targetQty: number
  countedQty: number
  price: number
}

export interface CountEntry {
  sku: string
  counterId: string
  quantity: number
  confirmedAt: string
}

export type PopisStatus = "ACTIVE" | "CLOSED" | "EXPIRED"

export interface PopisRecord {
  id: string
  name: string
  teamLabel: string
  status: PopisStatus
  createdAt: string
  expiresAt: string
  closedAt: string | null
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
  planType: string
  status: "aktivna" | "probni" | "istekla"
  seatsTotal: number
  maxLicenses: number
  subscriptionActive: boolean
  renewsOn: string
}

export interface AuthSession {
  userId: string
  username: string
  role: UserRole
}
