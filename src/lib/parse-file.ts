import Papa from "papaparse"
import * as XLSX from "xlsx"

export type ParsedFile = {
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
  allRows: Record<string, string>[]
}

const MAX_PREVIEW_ROWS = 50

function normalizeRows(
  headers: string[],
  matrix: unknown[][],
  limit?: number,
): Record<string, string>[] {
  const slice = limit ? matrix.slice(0, limit) : matrix
  return slice.map((row) => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      const value = row[index]
      record[header] = value === undefined || value === null ? "" : String(value)
    })
    return record
  })
}

async function parseCsv(file: File): Promise<ParsedFile> {
  const text = await file.text()
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  })

  const data = result.data.filter((row) => Array.isArray(row) && row.length > 0)
  if (data.length === 0) {
    throw new Error("Datoteka je prazna ili nije ispravnog formata.")
  }

  const headers = (data[0] as string[]).map((header, index) =>
    String(header ?? "").trim() || `Kolona ${index + 1}`,
  )
  const body = data.slice(1) as unknown[][]

  return {
    headers,
    rows: normalizeRows(headers, body, MAX_PREVIEW_ROWS),
    rowCount: body.length,
    allRows: normalizeRows(headers, body),
  }
}

async function parseXlsx(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  if (!sheet) {
    throw new Error("Radni list nije pronađen u datoteci.")
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  })

  if (matrix.length === 0) {
    throw new Error("Datoteka je prazna ili nije ispravnog formata.")
  }

  const headers = (matrix[0] as unknown[]).map((header, index) =>
    String(header ?? "").trim() || `Kolona ${index + 1}`,
  )
  const body = matrix.slice(1) as unknown[][]

  return {
    headers,
    rows: normalizeRows(headers, body, MAX_PREVIEW_ROWS),
    rowCount: body.length,
    allRows: normalizeRows(headers, body),
  }
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return parseCsv(file)
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseXlsx(file)
  }
  throw new Error("Nepodržan format. Učitajte .csv ili .xlsx datoteku.")
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}
