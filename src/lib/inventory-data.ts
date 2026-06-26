export interface Product {
  sku: string
  barcode: string
  name: string
  expectedQty: number
  /** storage location / shelf */
  location: string
}

export interface InventorySession {
  id: string
  name: string
  location: string
  /** when true, expected quantities are hidden from the worker */
  blind: boolean
  createdAt: string
}

export interface CountEntry {
  sku: string
  counted: number
  confirmedAt: string
}

export const SESSION: InventorySession = {
  id: "sess_2026_q2",
  name: "Q2 Skladišni popis",
  location: "Magacin A — Beograd",
  blind: false,
  createdAt: "2026-06-26T07:00:00Z",
}

export const PRODUCTS: Product[] = [
  {
    sku: "KAF-200",
    barcode: "3850000000017",
    name: "Kafa Mocca 200g",
    expectedQty: 42,
    location: "A-01-03",
  },
  {
    sku: "CAJ-050",
    barcode: "3850000000024",
    name: "Čaj Zeleni 50g",
    expectedQty: 18,
    location: "A-01-04",
  },
  {
    sku: "SOK-100",
    barcode: "3850000000031",
    name: "Sok Jabuka 1L",
    expectedQty: 120,
    location: "A-02-01",
  },
  {
    sku: "VOD-150",
    barcode: "3850000000048",
    name: "Voda Negazirana 1.5L",
    expectedQty: 240,
    location: "A-02-02",
  },
  {
    sku: "COK-090",
    barcode: "3850000000055",
    name: "Čokolada Mlečna 90g",
    expectedQty: 64,
    location: "A-03-01",
  },
  {
    sku: "KEK-300",
    barcode: "3850000000062",
    name: "Keks Integralni 300g",
    expectedQty: 36,
    location: "A-03-02",
  },
  {
    sku: "BRA-500",
    barcode: "3850000000079",
    name: "Brašno Pšenično 500g",
    expectedQty: 88,
    location: "A-04-01",
  },
  {
    sku: "SEC-1000",
    barcode: "3850000000086",
    name: "Šećer Kristal 1kg",
    expectedQty: 52,
    location: "A-04-02",
  },
  {
    sku: "ULJ-1000",
    barcode: "3850000000093",
    name: "Ulje Suncokret 1L",
    expectedQty: 75,
    location: "A-05-01",
  },
  {
    sku: "PAS-500",
    barcode: "3850000000109",
    name: "Pasta Penne 500g",
    expectedQty: 110,
    location: "A-05-02",
  },
]

/** Find a product by exact barcode or SKU, or partial SKU/name match. */
export function findProduct(query: string): Product | null {
  const q = query.trim().toLowerCase()
  if (!q) return null

  const exact = PRODUCTS.find(
    (p) => p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q,
  )
  if (exact) return exact

  const partial = PRODUCTS.find(
    (p) =>
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.barcode.includes(q),
  )
  return partial ?? null
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase()
  if (!q) return PRODUCTS
  return PRODUCTS.filter(
    (p) =>
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.barcode.includes(q),
  )
}
