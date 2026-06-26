/** Usklađivanje šifara između Excel-a i baze (npr. "003" → "3"). */
export function normalizeSifra(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^\d+$/.test(trimmed)) {
    const withoutLeadingZeros = trimmed.replace(/^0+(?=\d)/, "")
    return withoutLeadingZeros || "0"
  }
  return trimmed
}
