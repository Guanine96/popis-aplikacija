"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { useAuth } from "@/context/AuthContext"
import { UNMAPPED_VALUE } from "@/lib/import-fields"
import { normalizeSifra } from "@/lib/normalize-sifra"
import { createClient } from "@/lib/supabase/client"
import { fetchAllPages } from "@/lib/supabase/fetch-all"
import type {
  AppUser,
  CountEntry,
  InventorySession,
  PopisnaLine,
  Product,
  Subscription,
} from "@/lib/types"

interface ImportPayload {
  mapping: Record<string, string>
  rows: Record<string, string>[]
  blindInventory: boolean
}

interface PopisnaImportPayload {
  mapping: Record<string, string>
  rows: Record<string, string>[]
}

interface InventoryContextValue {
  session: InventorySession
  products: Product[]
  popisnaLines: PopisnaLine[]
  counts: CountEntry[]
  subscription: Subscription
  blind: boolean
  sifrarnikCount: number
  popisnaLineCount: number
  totalExpectedItems: number
  totalCountedItems: number
  totalFinancialValue: number
  progress: number
  counterStats: Array<{
    user: AppUser
    itemsCounted: number
    financialValue: number
    progress: number
  }>
  isLoading: boolean
  setBlind: (blind: boolean) => Promise<void>
  confirmCount: (sku: string, quantity: number) => Promise<void>
  getCountForSku: (sku: string) => number
  getTargetQty: (sku: string) => number
  getProduct: (query: string) => Product | null
  applyImport: (payload: ImportPayload) => Promise<number>
  applyPopisnaImport: (
    payload: PopisnaImportPayload,
  ) => Promise<{ updated: number; missing: number }>
}

const InventoryContext = createContext<InventoryContextValue | null>(null)

function parseNumber(value: string): number {
  const normalized = value.replace(/\s/g, "").replace(",", ".")
  const num = Number.parseFloat(normalized)
  return Number.isFinite(num) ? num : 0
}

type CompanyRow = {
  id: string
  name: string
  plan: string
  subscription_status: string
  seats_total: number
  renews_on: string | null
  session_name: string
  session_location: string
  blind_inventory: boolean
  created_at: string
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user, users, orgId } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [session, setSession] = useState<InventorySession>({
    id: "",
    name: "",
    location: "",
    blind: false,
    createdAt: new Date().toISOString(),
  })
  const [subscription, setSubscription] = useState<Subscription>({
    plan: "Pro",
    status: "aktivna",
    seatsTotal: 5,
    renewsOn: "",
  })
  const [products, setProducts] = useState<Product[]>([])
  const [popisnaLines, setPopisnaLines] = useState<PopisnaLine[]>([])
  const [counts, setCounts] = useState<CountEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadInventory = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", orgId)
      .single()

    if (company) {
      const row = company as CompanyRow
      setSession({
        id: row.id,
        name: row.session_name,
        location: row.session_location,
        blind: row.blind_inventory,
        createdAt: row.created_at,
      })
      setSubscription({
        plan: row.plan,
        status: row.subscription_status as Subscription["status"],
        seatsTotal: row.seats_total,
        renewsOn: row.renews_on ?? "",
      })
    }

    const { data: activeVersion } = await supabase
      .from("sifrarnik_versions")
      .select("id")
      .eq("company_id", orgId)
      .eq("is_active", true)
      .order("upload_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeVersion) {
      const items = await fetchAllPages((from, to) =>
        supabase
          .from("sifrarnik_items")
          .select("sifra, naziv, bar_kod, cena")
          .eq("sifrarnik_version_id", activeVersion.id)
          .order("sifra")
          .range(from, to),
      )

      setProducts(
        items.map((p) => ({
          sku: p.sifra,
          barcode: p.bar_kod ?? "",
          name: p.naziv,
          price: Number(p.cena ?? 0),
        })),
      )
    } else {
      setProducts([])
    }

    const { data: activePopis } = await supabase
      .from("popis")
      .select("id")
      .eq("company_id", orgId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activePopis) {
      const lines = await fetchAllPages((from, to) =>
        supabase
          .from("popis_items")
          .select("sifra, naziv, ciljana_kolicina, popisano, cena")
          .eq("company_id", orgId)
          .eq("popis_id", activePopis.id)
          .order("sifra")
          .range(from, to),
      )

      setPopisnaLines(
        lines.map((line) => ({
          sku: line.sifra,
          name: line.naziv,
          targetQty: Number(line.ciljana_kolicina ?? 0),
          countedQty: Number(line.popisano ?? 0),
          price: Number(line.cena ?? 0),
        })),
      )
    } else {
      setPopisnaLines([])
    }

    const events = await fetchAllPages((from, to) =>
      supabase
        .from("count_events")
        .select("sifra, profile_id, quantity, confirmed_at")
        .eq("company_id", orgId)
        .order("confirmed_at")
        .range(from, to),
    )

    setCounts(
      events.map((c) => ({
        sku: c.sifra,
        counterId: c.profile_id,
        quantity: c.quantity,
        confirmedAt: c.confirmed_at,
      })),
    )

    setIsLoading(false)
  }, [orgId, supabase])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel("inventory-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "count_events", filter: `company_id=eq.${orgId}` },
        () => loadInventory(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "popis_items", filter: `company_id=eq.${orgId}` },
        () => loadInventory(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `company_id=eq.${orgId}` },
        () => loadInventory(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "companies", filter: `id=eq.${orgId}` },
        () => loadInventory(),
      )
      .subscribe()

    const poll = window.setInterval(() => {
      void loadInventory()
    }, 15000)

    return () => {
      window.clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [supabase, orgId, loadInventory])

  const popisnaBySku = useMemo(
    () => new Map(popisnaLines.map((line) => [line.sku, line])),
    [popisnaLines],
  )

  const sifrarnikCount = products.length
  const popisnaLineCount = popisnaLines.length

  const totalExpectedItems = useMemo(
    () => popisnaLines.reduce((sum, line) => sum + line.targetQty, 0),
    [popisnaLines],
  )

  const totalCountedItems = useMemo(
    () => counts.reduce((sum, c) => sum + c.quantity, 0),
    [counts],
  )

  const totalFinancialValue = useMemo(
    () =>
      counts.reduce((sum, c) => {
        const product = products.find((p) => p.sku === c.sku)
        return sum + (product ? product.price * c.quantity : 0)
      }, 0),
    [counts, products],
  )

  const progress =
    totalExpectedItems === 0
      ? 0
      : Math.min(100, (totalCountedItems / totalExpectedItems) * 100)

  const counterStats = useMemo(() => {
    return users
      .filter((u) => u.role === "popisivac")
      .map((counter) => {
        const userCounts = counts.filter((c) => c.counterId === counter.id)
        const userQty = userCounts.reduce((s, c) => s + c.quantity, 0)
        const userProgress =
          totalExpectedItems === 0
            ? 0
            : Math.min(100, (userQty / totalExpectedItems) * 100)

        return {
          user: counter,
          itemsCounted: counter.itemsCounted,
          financialValue: counter.financialValue,
          progress: userProgress,
        }
      })
  }, [users, counts, totalExpectedItems])

  const setBlind = useCallback(
    async (blind: boolean) => {
      if (!orgId) return
      await supabase.from("companies").update({ blind_inventory: blind }).eq("id", orgId)
      setSession((prev) => ({ ...prev, blind }))
    },
    [orgId, supabase],
  )

  const getCountForSku = useCallback(
    (sku: string) => counts.filter((c) => c.sku === sku).reduce((s, e) => s + e.quantity, 0),
    [counts],
  )

  const getTargetQty = useCallback(
    (sku: string) => popisnaBySku.get(sku)?.targetQty ?? 0,
    [popisnaBySku],
  )

  const getProduct = useCallback(
    (query: string) => {
      const raw = query.trim()
      if (!raw) return null
      const q = raw.toLowerCase()
      const norm = normalizeSifra(raw)

      const exact = products.find(
        (p) =>
          p.barcode.toLowerCase() === q ||
          p.sku.toLowerCase() === q ||
          normalizeSifra(p.sku) === norm,
      )
      if (exact) return exact

      if (q.length < 2) return null

      return (
        products.find(
          (p) =>
            normalizeSifra(p.sku) === norm ||
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)),
        ) ?? null
      )
    },
    [products],
  )

  const confirmCount = useCallback(
    async (sku: string, quantity: number) => {
      if (!user || !orgId) {
        throw new Error("Niste prijavljeni")
      }

      const { data, error } = await supabase
        .from("count_events")
        .insert({
          company_id: orgId,
          profile_id: user.id,
          sifra: sku,
          quantity,
        })
        .select("id, sifra, quantity, confirmed_at, profile_id")
        .single()

      if (error) throw error

      setCounts((prev) => [
        ...prev,
        {
          sku: data.sifra,
          counterId: data.profile_id,
          quantity: data.quantity,
          confirmedAt: data.confirmed_at,
        },
      ])
    },
    [user, orgId, supabase],
  )

  const applyImport = useCallback(
    async ({ mapping, rows, blindInventory }: ImportPayload) => {
      if (!orgId || !user) return 0

      const imported = rows
        .map((row) => {
          const skuCol = mapping.sku
          const nameCol = mapping.name
          const priceCol = mapping.price
          if (!skuCol || skuCol === UNMAPPED_VALUE) return null
          if (!nameCol || nameCol === UNMAPPED_VALUE) return null
          if (!priceCol || priceCol === UNMAPPED_VALUE) return null

          const sku = row[skuCol]?.trim()
          const name = row[nameCol]?.trim()
          if (!sku || !name) return null

          const barcodeCol = mapping.barcode

          return {
            sifra: sku,
            naziv: name,
            bar_kod:
              barcodeCol && barcodeCol !== UNMAPPED_VALUE
                ? row[barcodeCol]?.trim() || ""
                : "",
            kolicina_na_zal: 0,
            cena: parseNumber(row[priceCol] || "0"),
          }
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)

      await supabase
        .from("sifrarnik_versions")
        .update({ is_active: false })
        .eq("company_id", orgId)

      const versionLabel = `v${new Date().toISOString().slice(0, 10)}`
      const { data: version } = await supabase
        .from("sifrarnik_versions")
        .insert({
          company_id: orgId,
          version: versionLabel,
          is_active: true,
          column_mapping: mapping,
        })
        .select("id")
        .single()

      if (!version) return 0

      if (imported.length > 0) {
        await supabase.from("sifrarnik_items").insert(
          imported.map((p) => ({
            sifrarnik_version_id: version.id,
            ...p,
          })),
        )
      }

      await supabase.from("count_events").delete().eq("company_id", orgId)
      await supabase
        .from("profiles")
        .update({ items_counted: 0, financial_value: 0 })
        .eq("company_id", orgId)

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) return 0

      const popisId = `POPIS-${orgId.slice(0, 8)}`
      await supabase.from("popis").upsert({
        id: popisId,
        company_id: orgId,
        created_by: authUser.id,
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "ACTIVE",
        sifrarnik_version_id: version.id,
      })

      await supabase.from("popis_items").delete().eq("company_id", orgId)

      await supabase
        .from("companies")
        .update({ blind_inventory: blindInventory })
        .eq("id", orgId)

      await loadInventory()
      return imported.length
    },
    [orgId, user, supabase, loadInventory],
  )

  const applyPopisnaImport = useCallback(
    async ({ mapping, rows }: PopisnaImportPayload) => {
      if (!orgId) throw new Error("Nema organizacije")

      const skuCol = mapping.sku
      const qtyCol = mapping.expectedQty
      if (!skuCol || skuCol === UNMAPPED_VALUE) throw new Error("Mapirajte šifru")
      if (!qtyCol || qtyCol === UNMAPPED_VALUE) throw new Error("Mapirajte količinu")

      const payload = rows
        .map((row) => {
          const sifra = row[skuCol]?.trim()
          if (!sifra) return null
          return { sifra, qty: parseNumber(row[qtyCol] || "0") }
        })
        .filter((row): row is { sifra: string; qty: number } => row !== null)

      const { data, error } = await supabase.rpc("import_popisna_lista", {
        p_company_id: orgId,
        p_rows: payload,
      })

      if (error) throw error

      const result = data as { updated: number; missing: number }
      await loadInventory()
      return {
        updated: Number(result.updated ?? 0),
        missing: Number(result.missing ?? 0),
      }
    },
    [orgId, supabase, loadInventory],
  )

  const value = useMemo<InventoryContextValue>(
    () => ({
      session,
      products,
      popisnaLines,
      counts,
      subscription,
      blind: session.blind,
      sifrarnikCount,
      popisnaLineCount,
      totalExpectedItems,
      totalCountedItems,
      totalFinancialValue,
      progress,
      counterStats,
      isLoading,
      setBlind,
      confirmCount,
      getCountForSku,
      getTargetQty,
      getProduct,
      applyImport,
      applyPopisnaImport,
    }),
    [
      session,
      products,
      popisnaLines,
      counts,
      subscription,
      sifrarnikCount,
      popisnaLineCount,
      totalExpectedItems,
      totalCountedItems,
      totalFinancialValue,
      progress,
      counterStats,
      isLoading,
      setBlind,
      confirmCount,
      getCountForSku,
      getTargetQty,
      getProduct,
      applyImport,
      applyPopisnaImport,
    ],
  )

  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  )
}

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error("useInventory mora biti unutar InventoryProvider-a")
  return ctx
}
