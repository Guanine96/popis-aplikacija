import type { CountEntry, PopisnaLine } from "@/lib/types"

export type ReconciliationStatus =
  | "usklađeno"
  | "višak"
  | "manjak"
  | "nije popisano"

export type ReconciliationFilter =
  | "all"
  | "differences"
  | "surplus"
  | "shortage"
  | "uncounted"

export type ReconciliationSortKey =
  | "barcode"
  | "name"
  | "bookQty"
  | "countedQty"
  | "difference"
  | "status"

export interface ReconciliationRow {
  sku: string
  barcode: string
  name: string
  bookQty: number
  countedQty: number
  difference: number
  status: ReconciliationStatus
  unitPrice: number
  valueDelta: number
}

export function buildCountedBySku(counts: CountEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const entry of counts) {
    map.set(entry.sku, (map.get(entry.sku) ?? 0) + entry.quantity)
  }
  return map
}

export function isIgnoredReconciliationRow(bookQty: number, countedQty: number): boolean {
  return bookQty === 0 && countedQty === 0
}

export function getReconciliationStatus(
  bookQty: number,
  countedQty: number,
): ReconciliationStatus {
  if (isIgnoredReconciliationRow(bookQty, countedQty)) {
    return "usklađeno"
  }
  if (countedQty === 0 && bookQty > 0) return "nije popisano"
  const difference = countedQty - bookQty
  if (difference > 0) return "višak"
  if (difference < 0) return "manjak"
  return "usklađeno"
}

export function buildReconciliationRows(
  lines: PopisnaLine[],
  counts: CountEntry[],
): ReconciliationRow[] {
  const countedBySku = buildCountedBySku(counts)

  return lines
    .map((line) => {
      const bookQty = line.targetQty
      const countedQty = countedBySku.get(line.sku) ?? line.countedQty ?? 0
      const difference = countedQty - bookQty
      const status = getReconciliationStatus(bookQty, countedQty)

      return {
        sku: line.sku,
        barcode: line.barcode,
        name: line.name,
        bookQty,
        countedQty,
        difference,
        status,
        unitPrice: line.price,
        valueDelta: difference * line.price,
      }
    })
    .filter((row) => !isIgnoredReconciliationRow(row.bookQty, row.countedQty))
}

export function filterReconciliationRows(
  rows: ReconciliationRow[],
  filter: ReconciliationFilter,
  search: string,
): ReconciliationRow[] {
  const q = search.trim().toLowerCase()

  return rows.filter((row) => {
    if (filter === "differences" && row.status === "usklađeno") return false
    if (filter === "surplus" && row.status !== "višak") return false
    if (filter === "shortage" && row.status !== "manjak") return false
    if (filter === "uncounted" && row.status !== "nije popisano") return false

    if (!q) return true
    return (
      row.name.toLowerCase().includes(q) ||
      row.barcode.toLowerCase().includes(q) ||
      row.sku.toLowerCase().includes(q)
    )
  })
}

const STATUS_ORDER: Record<ReconciliationStatus, number> = {
  "nije popisano": 0,
  manjak: 1,
  usklađeno: 2,
  višak: 3,
}

export function sortReconciliationRows(
  rows: ReconciliationRow[],
  key: ReconciliationSortKey,
  direction: "asc" | "desc",
): ReconciliationRow[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0
    switch (key) {
      case "barcode":
        cmp = a.barcode.localeCompare(b.barcode, "sr")
        break
      case "name":
        cmp = a.name.localeCompare(b.name, "sr")
        break
      case "bookQty":
        cmp = a.bookQty - b.bookQty
        break
      case "countedQty":
        cmp = a.countedQty - b.countedQty
        break
      case "difference":
        cmp = a.difference - b.difference
        break
      case "status":
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        break
    }
    return direction === "asc" ? cmp : -cmp
  })
  return sorted
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    rows: rows.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
  }
}

export function reconciliationSummary(rows: ReconciliationRow[]) {
  return rows.reduce(
    (acc, row) => {
      if (row.status === "usklađeno") acc.matched += 1
      if (row.status === "višak") acc.surplus += 1
      if (row.status === "manjak") acc.shortage += 1
      if (row.status === "nije popisano") acc.uncounted += 1
      if (row.bookQty > 0) acc.toCountTotal += 1
      return acc
    },
    { matched: 0, surplus: 0, shortage: 0, uncounted: 0, toCountTotal: 0 },
  )
}
