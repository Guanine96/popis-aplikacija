/** Normalizacija barkoda sa skenera (vodeće nule, razmaci). */
export function normalizeBarcode(value: string): string {
  const trimmed = value.trim().replace(/\s/g, "")
  if (!trimmed) return ""
  if (/^\d+$/.test(trimmed)) {
    return trimmed.replace(/^0+(?=\d)/, "") || "0"
  }
  return trimmed.toLowerCase()
}
