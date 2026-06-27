"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Search,
} from "lucide-react"

import { CyberCard } from "@/components/CyberCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useInventory } from "@/context/InventoryContext"
import { exportReconciliationToExcel } from "@/lib/export-reconciliation"
import { formatCurrency, formatNumber } from "@/lib/format"
import {
  buildReconciliationRows,
  filterReconciliationRows,
  paginateRows,
  reconciliationSummary,
  sortReconciliationRows,
  type ReconciliationFilter,
  type ReconciliationRow,
  type ReconciliationSortKey,
} from "@/lib/reconciliation"
import { cn } from "@/lib/utils"

const FILTER_OPTIONS: { value: ReconciliationFilter; label: string }[] = [
  { value: "all", label: "Prikaži celu listu" },
  { value: "differences", label: "Prikaži samo razlike" },
  { value: "surplus", label: "Samo viškovi" },
  { value: "shortage", label: "Samo manjkovi" },
  { value: "uncounted", label: "Nije popisano" },
]

const PAGE_SIZES = [25, 50, 100] as const

const STATUS_LABEL = {
  usklađeno: "Usklađeno",
  višak: "Višak",
  manjak: "Manjak",
  "nije popisano": "Nije popisano",
} as const

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: "asc" | "desc"
  onClick: () => void
}) {
  const Icon = active
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-left font-medium hover:text-cyan-300"
    >
      {label}
      <Icon className={cn("size-3.5", active ? "text-cyan-400" : "text-zinc-600")} />
    </button>
  )
}

function StatusBadge({ status }: { status: ReconciliationRow["status"] }) {
  return (
    <Badge
      className={cn(
        "border font-medium",
        status === "usklađeno" &&
          "border-teal-500/40 bg-teal-500/10 text-teal-300",
        status === "višak" &&
          "border-cyan-400/50 bg-cyan-500/15 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.15)]",
        status === "manjak" &&
          "border-rose-500/50 bg-rose-500/15 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
        status === "nije popisano" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-200",
      )}
    >
      {STATUS_LABEL[status]}
    </Badge>
  )
}

function rowTone(status: ReconciliationRow["status"]) {
  if (status === "višak") return "bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08]"
  if (status === "manjak") return "bg-rose-500/[0.06] hover:bg-rose-500/[0.1]"
  if (status === "nije popisano") return "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
  return "hover:bg-zinc-900/60"
}

function diffTone(status: ReconciliationRow["status"], diff: number) {
  if (status === "nije popisano") return "font-mono text-amber-300/80"
  if (diff > 0) return "font-mono font-semibold text-cyan-300"
  if (diff < 0) return "font-mono font-semibold text-rose-300"
  return "font-mono text-zinc-400"
}

export function PopisReconciliationTable() {
  const {
    session,
    activePopis,
    popisnaLines,
    counts,
    popisnaLineCount,
    isLoading,
  } = useInventory()

  const [filter, setFilter] = useState<ReconciliationFilter>("all")
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<ReconciliationSortKey>("difference")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(50)

  const allRows = useMemo(
    () => buildReconciliationRows(popisnaLines, counts),
    [popisnaLines, counts],
  )

  const filteredRows = useMemo(
    () => filterReconciliationRows(allRows, filter, search),
    [allRows, filter, search],
  )

  useEffect(() => {
    setPage(1)
  }, [filter, search])

  const sortedRows = useMemo(
    () => sortReconciliationRows(filteredRows, sortKey, sortDir),
    [filteredRows, sortKey, sortDir],
  )

  const { rows, total, totalPages, page: safePage } = useMemo(
    () => paginateRows(sortedRows, page, pageSize),
    [sortedRows, page, pageSize],
  )

  const summary = useMemo(() => reconciliationSummary(allRows), [allRows])

  function toggleSort(key: ReconciliationSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDir(key === "name" || key === "barcode" ? "asc" : "desc")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Učitavam popisnu listu…
      </div>
    )
  }

  if (popisnaLineCount === 0) {
    return (
      <CyberCard className="p-8 text-center" glow="cyan">
        <p className="text-lg font-semibold text-zinc-100">Nema popisne liste</p>
        <p className="mt-2 text-sm text-zinc-500">
          Prvo uvezite popisnu listu, pa se vratite na ovaj pregled.
        </p>
        <Button asChild className="mt-4">
          <Link href="/import/popisna">
            <FileSpreadsheet data-icon="inline-start" />
            Uvoz popisne liste
          </Link>
        </Button>
      </CyberCard>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400/80">
            Reconciliacija
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            Pregled popisa — tabela razlika
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {activePopis?.name ?? session.name} · {formatNumber(allRows.length)} stavki
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            exportReconciliationToExcel(
              sortedRows,
              activePopis?.name ?? session.name,
            )
          }
          className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
        >
          <Download data-icon="inline-start" />
          Izvezi u Excel
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <CyberCard className="p-4" glow="teal">
          <p className="text-xs uppercase tracking-wider text-teal-400/70">Usklađeno</p>
          <p className="mt-1 font-mono text-2xl font-bold text-teal-300">
            {formatNumber(summary.matched)}
          </p>
        </CyberCard>
        <CyberCard className="p-4" glow="cyan">
          <p className="text-xs uppercase tracking-wider text-cyan-400/70">Viškovi</p>
          <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">
            {formatNumber(summary.surplus)}
          </p>
        </CyberCard>
        <CyberCard className="p-4" glow="red">
          <p className="text-xs uppercase tracking-wider text-amber-400/70">Nije popisano</p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-300">
            {formatNumber(summary.uncounted)}
          </p>
        </CyberCard>
        <CyberCard className="p-4" glow="cyan">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Ukupno za popisati</p>
          <p className="mt-1 font-mono text-2xl font-bold text-zinc-200">
            {formatNumber(summary.toCountTotal)}
          </p>
        </CyberCard>
      </div>

      <CyberCard className="p-4" glow="cyan">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraga po nazivu, barkodu ili šifri…"
              className="h-10 border-cyan-500/20 bg-zinc-900/60 pl-9"
            />
          </div>

          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as ReconciliationFilter)}
          >
            <SelectTrigger className="h-10 w-full min-w-[220px] border-cyan-500/20 bg-zinc-900/60 lg:w-auto">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value) as (typeof PAGE_SIZES)[number])
              setPage(1)
            }}
          >
            <SelectTrigger className="h-10 w-full min-w-[120px] border-cyan-500/20 bg-zinc-900/60 lg:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / strana
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CyberCard>

      <CyberCard className="overflow-hidden p-0" glow="cyan">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-cyan-500/10 hover:bg-transparent">
                <TableHead>
                  <SortButton
                    label="Barkod"
                    active={sortKey === "barcode"}
                    direction={sortDir}
                    onClick={() => toggleSort("barcode")}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Naziv artikla"
                    active={sortKey === "name"}
                    direction={sortDir}
                    onClick={() => toggleSort("name")}
                  />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton
                    label="Knjig. stanje"
                    active={sortKey === "bookQty"}
                    direction={sortDir}
                    onClick={() => toggleSort("bookQty")}
                  />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton
                    label="Popisano"
                    active={sortKey === "countedQty"}
                    direction={sortDir}
                    onClick={() => toggleSort("countedQty")}
                  />
                </TableHead>
                <TableHead className="text-right">
                  <SortButton
                    label="Razlika"
                    active={sortKey === "difference"}
                    direction={sortDir}
                    onClick={() => toggleSort("difference")}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Status"
                    active={sortKey === "status"}
                    direction={sortDir}
                    onClick={() => toggleSort("status")}
                  />
                </TableHead>
                <TableHead className="text-right">Vred. razlika</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-zinc-500">
                    Nema stavki za izabrani filter ili pretragu.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.sku} className={cn("border-cyan-500/5", rowTone(row.status))}>
                    <TableCell className="font-mono text-xs text-zinc-400">
                      {row.barcode || "—"}
                      <span className="mt-0.5 block text-[10px] text-zinc-600">
                        {row.sku}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[280px] font-medium text-zinc-100">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-zinc-300">
                      {formatNumber(row.bookQty)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-zinc-300">
                      {formatNumber(row.countedQty)}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", diffTone(row.status, row.difference))}>
                      {row.status === "nije popisano"
                        ? "—"
                        : row.difference > 0
                          ? `+${formatNumber(row.difference)}`
                          : formatNumber(row.difference)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono text-sm tabular-nums",
                        row.valueDelta > 0 && "text-cyan-300",
                        row.valueDelta < 0 && "text-rose-300",
                        row.valueDelta === 0 && "text-zinc-500",
                      )}
                    >
                      {formatCurrency(row.valueDelta)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-cyan-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            Prikazano {rows.length} od {formatNumber(total)} stavki
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-cyan-500/20"
            >
              Prethodna
            </Button>
            <span className="min-w-16 text-center text-sm text-zinc-400">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-cyan-500/20"
            >
              Sledeća
            </Button>
          </div>
        </div>
      </CyberCard>
    </div>
  )
}
