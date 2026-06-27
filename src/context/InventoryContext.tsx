"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { useAuth } from "@/context/AuthContext"
import { UNMAPPED_VALUE } from "@/lib/import-fields"
import { normalizeSifra } from "@/lib/normalize-sifra"
import {
  buildPopisProductLookup,
  enrichPopisnaWithCatalog,
  lookupPopisProduct,
} from "@/lib/merge-popisna-catalog"
import {
  countPending,
  enqueuePendingCount,
  listPendingCounts,
  removePendingCount,
} from "@/lib/offline-count-queue"
import {
  getStoredPopisId,
  setStoredPopisId,
} from "@/lib/popis-session-storage"
import { createClient } from "@/lib/supabase/client"
import { fetchAllPages } from "@/lib/supabase/fetch-all"
import type {
  AppUser,
  CountEntry,
  InventorySession,
  PopisnaLine,
  PopisRecord,
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
  activePopis: PopisRecord | null
  popisi: PopisRecord[]
  isPopisClosed: boolean
  pendingOfflineCount: number
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
  totalExpectedFinancialValue: number
  progress: number
  counterStats: Array<{
    user: AppUser
    itemsCounted: number
    financialValue: number
    progress: number
  }>
  isLoading: boolean
  refreshInventory: () => void
  setBlind: (blind: boolean) => Promise<void>
  setActivePopis: (popisId: string) => void
  createPopis: (name: string, teamLabel: string, location?: string) => Promise<PopisRecord>
  closeActivePopis: () => Promise<void>
  syncOfflineCounts: () => Promise<number>
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
  plan_type: string | null
  subscription_status: string
  subscription_active: boolean | null
  seats_total: number
  max_licenses: number | null
  renews_on: string | null
  session_name: string
  session_location: string
  blind_inventory: boolean
  created_at: string
}

type PopisRow = {
  id: string
  name: string | null
  team_label: string | null
  status: string
  created_at: string
  expires_at: string | null
  closed_at: string | null
}

function mapPopisRow(row: PopisRow): PopisRecord {
  return {
    id: row.id,
    name: row.name ?? "Popis",
    teamLabel: row.team_label ?? "",
    status: row.status as PopisRecord["status"],
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? row.created_at,
    closedAt: row.closed_at,
  }
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
    planType: "Mediolitics",
    status: "aktivna",
    seatsTotal: 5,
    maxLicenses: 5,
    subscriptionActive: true,
    renewsOn: "",
  })
  const [activePopis, setActivePopisState] = useState<PopisRecord | null>(null)
  const [popisi, setPopisi] = useState<PopisRecord[]>([])
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [popisnaLines, setPopisnaLines] = useState<PopisnaLine[]>([])
  const [counts, setCounts] = useState<CountEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  const loadInventory = useCallback(async (silent = false) => {
    if (!orgId) {
      setIsLoading(false)
      return
    }

    if (!silent) {
      setIsLoading(true)
    }

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
        planType: row.plan_type ?? row.plan ?? "Mediolitics",
        status: row.subscription_status as Subscription["status"],
        seatsTotal: row.seats_total,
        maxLicenses: row.max_licenses ?? row.seats_total,
        subscriptionActive: row.subscription_active ?? true,
        renewsOn: row.renews_on ?? "",
      })
    }

    const [popisResult, versionResult] = await Promise.all([
      supabase
        .from("popis")
        .select("id, name, team_label, status, created_at, expires_at, closed_at")
        .eq("company_id", orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("sifrarnik_versions")
        .select("id")
        .eq("company_id", orgId)
        .eq("is_active", true)
        .order("upload_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const allPopisi = (popisResult.data ?? []).map(mapPopisRow)
    setPopisi(allPopisi)

    const storedId = getStoredPopisId(orgId)
    const selectedPopis =
      allPopisi.find((p) => p.id === storedId && p.status === "ACTIVE") ??
      allPopisi.find((p) => p.status === "ACTIVE") ??
      null

    setActivePopisState(selectedPopis)
    if (selectedPopis && orgId) {
      setStoredPopisId(orgId, selectedPopis.id)
    }

    const activeVersion = versionResult.data
    let popisnaLoaded = false

    if (selectedPopis) {
      const lines = await fetchAllPages((from, to) =>
        supabase
          .from("popis_items")
          .select("sifra, naziv, bar_kod, ciljana_kolicina, popisano, cena")
          .eq("company_id", orgId)
          .eq("popis_id", selectedPopis.id)
          .order("sifra")
          .range(from, to),
      )

      setPopisnaLines(
        lines.map((line) => ({
          sku: line.sifra,
          name: line.naziv,
          barcode: line.bar_kod ?? "",
          targetQty: Number(line.ciljana_kolicina ?? 0),
          countedQty: Number(line.popisano ?? 0),
          price: Number(line.cena ?? 0),
        })),
      )
      popisnaLoaded = lines.length > 0
    } else {
      setPopisnaLines([])
    }

    if (popisnaLoaded) {
      setIsLoading(false)
    }

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

    const events = await fetchAllPages((from, to) => {
      let query = supabase
        .from("count_events")
        .select("sifra, profile_id, quantity, confirmed_at, popis_id")
        .eq("company_id", orgId)
        .order("confirmed_at")
        .range(from, to)

      if (selectedPopis) {
        query = query.eq("popis_id", selectedPopis.id)
      }
      return query
    })

    setCounts(
      events.map((c) => ({
        sku: c.sifra,
        counterId: c.profile_id,
        quantity: c.quantity,
        confirmedAt: c.confirmed_at,
      })),
    )

    if (selectedPopis && orgId) {
      const pending = await countPending(orgId, selectedPopis.id)
      setPendingOfflineCount(pending)
    } else {
      setPendingOfflineCount(0)
    }

    setIsLoading(false)
    hasLoadedRef.current = true
  }, [orgId, supabase])

  const refreshInventory = useCallback(() => {
    void loadInventory(true)
  }, [loadInventory])

  useEffect(() => {
    void loadInventory(false)
  }, [loadInventory])

  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel("inventory-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "count_events", filter: `company_id=eq.${orgId}` },
        () => refreshInventory(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "popis_items", filter: `company_id=eq.${orgId}` },
        () => refreshInventory(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `company_id=eq.${orgId}` },
        () => refreshInventory(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "companies", filter: `id=eq.${orgId}` },
        () => refreshInventory(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, orgId, refreshInventory])

  const enrichedPopisnaLines = useMemo(
    () => enrichPopisnaWithCatalog(popisnaLines, products),
    [popisnaLines, products],
  )

  const popisnaBySku = useMemo(() => {
    const map = new Map<string, PopisnaLine>()
    for (const line of enrichedPopisnaLines) {
      map.set(line.sku, line)
      map.set(normalizeSifra(line.sku), line)
    }
    return map
  }, [enrichedPopisnaLines])

  const sifrarnikCount = products.length
  const popisnaLineCount = popisnaLines.length

  const totalExpectedItems = useMemo(
    () => enrichedPopisnaLines.reduce((sum, line) => sum + line.targetQty, 0),
    [enrichedPopisnaLines],
  )

  const totalCountedItems = useMemo(
    () => counts.reduce((sum, c) => sum + c.quantity, 0),
    [counts],
  )

  const totalFinancialValue = useMemo(
    () =>
      counts.reduce((sum, c) => {
        const line = popisnaBySku.get(c.sku)
        return sum + (line?.price ?? 0) * c.quantity
      }, 0),
    [counts, popisnaBySku],
  )

  const totalExpectedFinancialValue = useMemo(
    () => enrichedPopisnaLines.reduce((sum, line) => sum + line.price * line.targetQty, 0),
    [enrichedPopisnaLines],
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
        const userFinancial = userCounts.reduce((sum, c) => {
          const line = popisnaBySku.get(c.sku)
          return sum + (line?.price ?? 0) * c.quantity
        }, 0)
        const userProgress =
          totalExpectedItems === 0
            ? 0
            : Math.min(100, (userQty / totalExpectedItems) * 100)

        return {
          user: counter,
          itemsCounted: userQty,
          financialValue: userFinancial,
          progress: userProgress,
        }
      })
  }, [users, counts, totalExpectedItems, popisnaBySku])

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
    (sku: string) =>
      popisnaBySku.get(sku)?.targetQty ??
      popisnaBySku.get(normalizeSifra(sku))?.targetQty ??
      0,
    [popisnaBySku],
  )

  const productLookup = useMemo(
    () => buildPopisProductLookup(popisnaLines, products),
    [popisnaLines, products],
  )

  const getProduct = useCallback(
    (query: string) =>
      lookupPopisProduct(query, productLookup.bySku, productLookup.byBarcode),
    [productLookup],
  )

  const isPopisClosed = activePopis?.status !== "ACTIVE"

  const setActivePopis = useCallback(
    (popisId: string) => {
      if (!orgId) return
      setStoredPopisId(orgId, popisId)
      void loadInventory(true)
    },
    [orgId, loadInventory],
  )

  const syncOfflineCounts = useCallback(async () => {
    if (!user || !orgId || !activePopis) return 0
    const pending = await listPendingCounts(orgId, activePopis.id)
    let synced = 0

    for (const item of pending) {
      const { error } = await supabase.from("count_events").insert({
        company_id: orgId,
        profile_id: item.profileId,
        sifra: item.sku,
        quantity: item.quantity,
        popis_id: item.popisId,
      })
      if (!error) {
        await removePendingCount(item.id)
        synced += 1
      }
    }

    if (synced > 0) {
      await loadInventory(true)
    } else {
      setPendingOfflineCount(await countPending(orgId, activePopis.id))
    }
    return synced
  }, [user, orgId, activePopis, supabase, loadInventory])

  useEffect(() => {
    if (!orgId || !activePopis) return

    const sync = () => {
      if (navigator.onLine) void syncOfflineCounts()
    }

    window.addEventListener("online", sync)
    void syncOfflineCounts()

    return () => window.removeEventListener("online", sync)
  }, [orgId, activePopis?.id, syncOfflineCounts])

  const createPopis = useCallback(
    async (name: string, teamLabel: string, location?: string) => {
      if (!orgId) throw new Error("Nema organizacije")

      const { data, error } = await supabase.rpc("create_popis_session", {
        p_company_id: orgId,
        p_name: name,
        p_team_label: teamLabel || null,
        p_location: location || null,
      })

      if (error) throw new Error(error.message)
      const row = data as PopisRow & { team_label?: string | null }
      const record = mapPopisRow({
        id: row.id,
        name: row.name,
        team_label: row.team_label ?? null,
        status: row.status,
        created_at: row.created_at,
        expires_at: row.expires_at ?? null,
        closed_at: row.closed_at ?? null,
      })
      setStoredPopisId(orgId, record.id)
      await loadInventory(true)
      return record
    },
    [orgId, supabase, loadInventory],
  )

  const closeActivePopis = useCallback(async () => {
    if (!activePopis) throw new Error("Nema aktivnog popisa")

    const { error } = await supabase.rpc("close_popis_session", {
      p_popis_id: activePopis.id,
    })

    if (error) throw new Error(error.message)
    await loadInventory(true)
  }, [activePopis, supabase, loadInventory])

  const confirmCount = useCallback(
    async (sku: string, quantity: number) => {
      if (!user || !orgId || !activePopis) {
        throw new Error("Niste prijavljeni ili nema aktivnog popisa")
      }
      if (activePopis.status !== "ACTIVE") {
        throw new Error("Popis je zatvoren — unos nije moguć")
      }

      const optimistic: CountEntry = {
        sku,
        counterId: user.id,
        quantity,
        confirmedAt: new Date().toISOString(),
      }

      if (!navigator.onLine) {
        await enqueuePendingCount({
          orgId,
          popisId: activePopis.id,
          profileId: user.id,
          sku,
          quantity,
        })
        setCounts((prev) => [...prev, optimistic])
        setPendingOfflineCount((n) => n + 1)
        return
      }

      const { data, error } = await supabase
        .from("count_events")
        .insert({
          company_id: orgId,
          profile_id: user.id,
          sifra: sku,
          quantity,
          popis_id: activePopis.id,
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
    [user, orgId, activePopis, supabase],
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

      const versionLabel = `v${new Date().toISOString().slice(0, 10)}`
      const { data: importedCount, error: importError } = await supabase.rpc(
        "replace_sifrarnik_for_company",
        {
          p_company_id: orgId,
          p_version_label: versionLabel,
          p_column_mapping: mapping,
          p_items: imported,
        },
      )

      if (importError) throw new Error(importError.message)

      await supabase
        .from("companies")
        .update({ blind_inventory: blindInventory })
        .eq("id", orgId)

      await loadInventory()
      return Number(importedCount ?? imported.length)
    },
    [orgId, user, supabase, loadInventory],
  )

  const applyPopisnaImport = useCallback(
    async ({ mapping, rows }: PopisnaImportPayload) => {
      if (!orgId) throw new Error("Nema organizacije")
      if (!activePopis || activePopis.status !== "ACTIVE") {
        throw new Error("Kreirajte ili izaberite aktivni popis pre uvoza")
      }

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

      const chunkSize = 400
      let totalUpdated = 0
      let totalMissing = 0

      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize)
        const { data, error } = await supabase.rpc("import_popisna_lista", {
          p_company_id: orgId,
          p_rows: chunk,
          p_reset: i === 0,
          p_popis_id: activePopis.id,
        })

        if (error) {
          throw new Error(error.message)
        }

        if (!data) {
          throw new Error("Server nije vratio rezultat uvoza")
        }

        const result = data as { updated: number; missing: number }
        totalUpdated += Number(result.updated ?? 0)
        totalMissing += Number(result.missing ?? 0)
      }

      await loadInventory()
      return {
        updated: totalUpdated,
        missing: totalMissing,
      }
    },
    [orgId, activePopis, supabase, loadInventory],
  )

  const value = useMemo<InventoryContextValue>(
    () => ({
      session,
      activePopis,
      popisi,
      isPopisClosed,
      pendingOfflineCount,
      products,
      popisnaLines: enrichedPopisnaLines,
      counts,
      subscription,
      blind: session.blind,
      sifrarnikCount,
      popisnaLineCount,
      totalExpectedItems,
      totalCountedItems,
      totalFinancialValue,
      totalExpectedFinancialValue,
      progress,
      counterStats,
      isLoading,
      refreshInventory,
      setBlind,
      setActivePopis,
      createPopis,
      closeActivePopis,
      syncOfflineCounts,
      confirmCount,
      getCountForSku,
      getTargetQty,
      getProduct,
      applyImport,
      applyPopisnaImport,
    }),
    [
      session,
      activePopis,
      popisi,
      isPopisClosed,
      pendingOfflineCount,
      products,
      enrichedPopisnaLines,
      counts,
      subscription,
      sifrarnikCount,
      popisnaLineCount,
      totalExpectedItems,
      totalCountedItems,
      totalFinancialValue,
      totalExpectedFinancialValue,
      progress,
      counterStats,
      isLoading,
      refreshInventory,
      setBlind,
      setActivePopis,
      createPopis,
      closeActivePopis,
      syncOfflineCounts,
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
