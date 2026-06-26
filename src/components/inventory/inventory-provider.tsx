"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  PRODUCTS,
  SESSION,
  type CountEntry,
  type InventorySession,
  type Product,
} from "@/lib/inventory-data"

interface InventoryContextValue {
  session: InventorySession
  products: Product[]
  /** keyed by SKU */
  counts: Record<string, CountEntry>
  countedSkus: number
  totalSkus: number
  progress: number
  blind: boolean
  setBlind: (blind: boolean) => void
  confirmCount: (sku: string, counted: number) => void
  getCount: (sku: string) => CountEntry | undefined
  resetCounts: () => void
}

const InventoryContext = createContext<InventoryContextValue | null>(null)

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<InventorySession>(SESSION)
  const [counts, setCounts] = useState<Record<string, CountEntry>>({})

  const confirmCount = useCallback((sku: string, counted: number) => {
    setCounts((prev) => ({
      ...prev,
      [sku]: { sku, counted, confirmedAt: new Date().toISOString() },
    }))
  }, [])

  const getCount = useCallback((sku: string) => counts[sku], [counts])

  const setBlind = useCallback((blind: boolean) => {
    setSession((prev) => ({ ...prev, blind }))
  }, [])

  const resetCounts = useCallback(() => setCounts({}), [])

  const countedSkus = Object.keys(counts).length
  const totalSkus = PRODUCTS.length

  const value = useMemo<InventoryContextValue>(
    () => ({
      session,
      products: PRODUCTS,
      counts,
      countedSkus,
      totalSkus,
      progress: totalSkus === 0 ? 0 : (countedSkus / totalSkus) * 100,
      blind: session.blind,
      setBlind,
      confirmCount,
      getCount,
      resetCounts,
    }),
    [session, counts, countedSkus, totalSkus, setBlind, confirmCount, getCount, resetCounts],
  )

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) {
    throw new Error("useInventory must be used within an InventoryProvider")
  }
  return ctx
}
