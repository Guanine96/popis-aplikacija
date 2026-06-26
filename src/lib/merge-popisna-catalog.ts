import { normalizeBarcode } from "@/lib/normalize-barcode"
import { normalizeSifra } from "@/lib/normalize-sifra"
import type { PopisnaLine, Product } from "@/lib/types"

function catalogIndex(products: Product[]) {
  const bySku = new Map<string, Product>()
  for (const product of products) {
    bySku.set(product.sku, product)
    bySku.set(normalizeSifra(product.sku), product)
  }
  return bySku
}

export function findCatalogProduct(
  sku: string,
  catalogBySku: Map<string, Product>,
): Product | undefined {
  return catalogBySku.get(sku) ?? catalogBySku.get(normalizeSifra(sku))
}

/** Popisna lista + barkod/naziv/cena iz šifrarnika gde popisna nema podatke. */
export function enrichPopisnaWithCatalog(
  popisnaLines: PopisnaLine[],
  products: Product[],
): PopisnaLine[] {
  const catalogBySku = catalogIndex(products)

  return popisnaLines.map((line) => {
    const catalog = findCatalogProduct(line.sku, catalogBySku)
    if (!catalog) return line

    return {
      ...line,
      name: line.name.trim() || catalog.name,
      barcode: line.barcode.trim() || catalog.barcode.trim(),
      price: line.price > 0 ? line.price : catalog.price,
    }
  })
}

function registerBarcodeKey(byBarcode: Map<string, Product>, key: string, product: Product) {
  const trimmed = key.trim()
  if (!trimmed) return
  byBarcode.set(trimmed, product)
}

/** Više ključeva za isti barkod (EAN sa/ bez vodeće nule). */
export function registerBarcodeAliases(
  byBarcode: Map<string, Product>,
  barcode: string,
  product: Product,
) {
  const raw = barcode.trim()
  if (!raw) return

  registerBarcodeKey(byBarcode, raw, product)
  registerBarcodeKey(byBarcode, normalizeBarcode(raw), product)

  if (/^\d+$/.test(raw)) {
    const digits = raw.replace(/\s/g, "")
    registerBarcodeKey(byBarcode, digits, product)

    if (digits.length === 13 && digits.startsWith("0")) {
      registerBarcodeKey(byBarcode, digits.replace(/^0+(?=\d)/, "") || "0", product)
    }
    if (digits.length >= 8 && digits.length < 13) {
      registerBarcodeKey(byBarcode, digits.padStart(13, "0"), product)
    }
  }
}

export function buildPopisProductLookup(popisnaLines: PopisnaLine[], products: Product[]) {
  const enriched = enrichPopisnaWithCatalog(popisnaLines, products)
  const catalogBySku = catalogIndex(products)
  const bySku = new Map<string, Product>()
  const byBarcode = new Map<string, Product>()

  for (const line of enriched) {
    const catalog = findCatalogProduct(line.sku, catalogBySku)
    const merged: Product = {
      sku: line.sku,
      name: line.name.trim() || catalog?.name || line.sku,
      price: line.price > 0 ? line.price : (catalog?.price ?? 0),
      barcode: line.barcode.trim() || catalog?.barcode.trim() || "",
    }

    bySku.set(line.sku, merged)
    bySku.set(normalizeSifra(line.sku), merged)

    if (merged.barcode) {
      registerBarcodeAliases(byBarcode, merged.barcode, merged)
    }

    if (!line.barcode.trim() && catalog?.barcode.trim()) {
      registerBarcodeAliases(byBarcode, catalog.barcode, merged)
    }
  }

  return { bySku, byBarcode, enrichedPopisnaLines: enriched }
}

export function lookupPopisProduct(
  query: string,
  bySku: Map<string, Product>,
  byBarcode: Map<string, Product>,
): Product | null {
  const raw = query.trim()
  if (!raw) return null

  return (
    byBarcode.get(raw) ??
    byBarcode.get(normalizeBarcode(raw)) ??
    bySku.get(raw) ??
    bySku.get(normalizeSifra(raw)) ??
    null
  )
}
