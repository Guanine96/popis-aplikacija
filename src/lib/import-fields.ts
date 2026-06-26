export type SystemField = {
  id: string
  label: string
  required: boolean
  hint: string
  match: string[]
}

export const SYSTEM_FIELDS: SystemField[] = [
  {
    id: "sku",
    label: "Šifra / SKU",
    required: true,
    hint: "Jedinstveni identifikator artikla",
    match: ["sifra", "šifra", "sku", "code", "kod", "id", "artikal"],
  },
  {
    id: "barcode",
    label: "Barkod",
    required: false,
    hint: "EAN / barkod oznaka",
    match: ["barkod", "barcode", "ean", "upc"],
  },
  {
    id: "name",
    label: "Naziv artikla",
    required: true,
    hint: "Opisni naziv proizvoda",
    match: ["naziv", "name", "title", "proizvod", "artikal", "opis"],
  },
  {
    id: "expectedQty",
    label: "Očekivana količina (popisna lista)",
    required: false,
    hint: "Knjigovodstveno stanje — ako imate poseban fajl, uvezite ga na „Uvoz popisne liste“",
    match: [
      "kolicina",
      "količina",
      "kolicina na zal",
      "količina na zal",
      "stanje zaliha",
      "na zalihi",
      "zaloga",
      "qty",
      "quantity",
      "stanje",
      "stock",
      "kol",
      "ocekivano",
      "očekivano",
      "ciljana",
      "popisna",
    ],
  },
  {
    id: "price",
    label: "Cena artikla",
    required: true,
    hint: "Obavezno za finansijski obračun popisa",
    match: ["cena", "price", "cijena", "vrednost", "iznos", "vpc", "mpc"],
  },
]

export const UNMAPPED_VALUE = "__unmapped__"

export function autoMap(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const used = new Set<string>()

  for (const field of SYSTEM_FIELDS) {
    const found = headers.find((header) => {
      if (used.has(header)) return false
      const normalized = header.toLowerCase().trim()
      return field.match.some((keyword) => normalized.includes(keyword))
    })
    if (found) {
      mapping[field.id] = found
      used.add(found)
    } else {
      mapping[field.id] = UNMAPPED_VALUE
    }
  }

  return mapping
}
