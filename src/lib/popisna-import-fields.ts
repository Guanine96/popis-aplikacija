export type PopisnaField = {
  id: string
  label: string
  required: boolean
  hint: string
  match: string[]
}

export const POPISNA_FIELDS: PopisnaField[] = [
  {
    id: "sku",
    label: "Šifra artikla",
    required: true,
    hint: "Mora da se poklapa sa šifrom iz šifrarnika",
    match: ["sifra", "šifra", "sku", "code", "kod", "artikal"],
  },
  {
    id: "expectedQty",
    label: "Količina (popisna lista)",
    required: true,
    hint: "Knjigovodstveno stanje — ciljana količina za popis",
    match: [
      "kolicina",
      "količina",
      "količina na zal",
      "kolicina na zal",
      "stanje",
      "stanje zaliha",
      "na zalihi",
      "zaloga",
      "qty",
      "quantity",
      "ciljana",
      "ocekivano",
      "očekivano",
      "popisna",
      "kol",
    ],
  },
]

export function autoMapPopisna(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const used = new Set<string>()

  for (const field of POPISNA_FIELDS) {
    const found = headers.find((header) => {
      if (used.has(header)) return false
      const normalized = header.toLowerCase().trim()
      return field.match.some((keyword) => normalized.includes(keyword))
    })
    if (found) {
      mapping[field.id] = found
      used.add(found)
    } else {
      mapping[field.id] = "__unmapped__"
    }
  }

  return mapping
}
