import * as XLSX from "xlsx"

import type { ReconciliationRow } from "@/lib/reconciliation"

const STATUS_LABEL: Record<ReconciliationRow["status"], string> = {
  usklađeno: "Usklađeno",
  višak: "Višak",
  manjak: "Manjak",
}

export function exportReconciliationToExcel(
  rows: ReconciliationRow[],
  sessionName: string,
) {
  const sheetRows = rows.map((row) => ({
    Barkod: row.barcode || row.sku,
    Šifra: row.sku,
    "Naziv artikla": row.name,
    "Knjigovodstveno stanje": row.bookQty,
    "Popisano stanje": row.countedQty,
    Razlika: row.difference,
    Status: STATUS_LABEL[row.status],
    "Cena (RSD)": row.unitPrice,
    "Vrednosna razlika (RSD)": row.valueDelta,
  }))

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(sheetRows)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Popis")

  const safeName = sessionName.replace(/[^\w\s-]/g, "").trim() || "popis"
  XLSX.writeFile(workbook, `${safeName}-reconciliacija.xlsx`)
}
