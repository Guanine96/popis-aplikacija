import type { AppUser, InventorySession, Product, Subscription } from "@/lib/types"

export const DEFAULT_SUBSCRIPTION: Subscription = {
  plan: "Pro",
  status: "aktivna",
  seatsTotal: 5,
  renewsOn: "2026-07-15",
}

export const DEFAULT_SESSION: InventorySession = {
  id: "sess_2026_q2",
  name: "Q2 Skladišni popis",
  location: "Magacin A — Beograd",
  blind: false,
  createdAt: "2026-06-26T07:00:00Z",
}

export const DEFAULT_PRODUCTS: Product[] = [
  { sku: "KAF-200", barcode: "3850000000017", name: "Kafa Mocca 200g", expectedQty: 42, price: 890 },
  { sku: "CAJ-050", barcode: "3850000000024", name: "Čaj Zeleni 50g", expectedQty: 18, price: 420 },
  { sku: "SOK-100", barcode: "3850000000031", name: "Sok Jabuka 1L", expectedQty: 120, price: 180 },
  { sku: "VOD-150", barcode: "3850000000048", name: "Voda Negazirana 1.5L", expectedQty: 240, price: 95 },
  { sku: "COK-090", barcode: "3850000000055", name: "Čokolada Mlečna 90g", expectedQty: 64, price: 310 },
  { sku: "KEK-300", barcode: "3850000000062", name: "Keks Integralni 300g", expectedQty: 36, price: 260 },
  { sku: "BRA-500", barcode: "3850000000079", name: "Brašno Pšenično 500g", expectedQty: 88, price: 145 },
  { sku: "SEC-1000", barcode: "3850000000086", name: "Šećer Kristal 1kg", expectedQty: 52, price: 120 },
  { sku: "ULJ-1000", barcode: "3850000000093", name: "Ulje Suncokret 1L", expectedQty: 75, price: 380 },
  { sku: "PAS-500", barcode: "3850000000109", name: "Pasta Penne 500g", expectedQty: 110, price: 210 },
]

export const DEFAULT_USERS: AppUser[] = [
  {
    id: "usr_admin",
    username: "admin",
    password: "admin123",
    displayName: "Predsednik komisije",
    role: "admin",
    isOnline: true,
    itemsCounted: 0,
    financialValue: 0,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "usr_01",
    username: "marko",
    password: "marko123",
    displayName: "Marko Popović",
    role: "popisivac",
    isOnline: true,
    itemsCounted: 12,
    financialValue: 48500,
    createdAt: "2026-03-10T00:00:00Z",
  },
  {
    id: "usr_02",
    username: "ana",
    password: "ana123",
    displayName: "Ana Jovanović",
    role: "popisivac",
    isOnline: true,
    itemsCounted: 8,
    financialValue: 31200,
    createdAt: "2026-03-12T00:00:00Z",
  },
]

export function findProduct(
  products: Product[],
  query: string,
): Product | null {
  const q = query.trim().toLowerCase()
  if (!q) return null

  const exact = products.find(
    (p) => p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q,
  )
  if (exact) return exact

  return (
    products.find(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q),
    ) ?? null
  )
}
