"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Check,
  CheckCircle2,
  EyeOff,
  MapPin,
  PackageSearch,
  ScanBarcode,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { findProduct, type Product } from "@/lib/inventory-data"
import { useInventory } from "@/components/inventory/inventory-provider"
import { NumericKeypad } from "@/components/count/numeric-keypad"
import { ProductSearch } from "@/components/count/product-search"
import { BarcodeScanner } from "@/components/count/barcode-scanner"

export function CountView() {
  const { session, blind, confirmCount, getCount, countedSkus, totalSkus, progress } =
    useInventory()

  const [product, setProduct] = useState<Product | null>(null)
  const [entry, setEntry] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)

  const previous = product ? getCount(product.sku) : undefined
  const enteredQty = entry === "" ? 0 : Number.parseInt(entry, 10)
  const variance = product && !blind ? enteredQty - product.expectedQty : null

  function selectProduct(next: Product) {
    setProduct(next)
    setEntry("")
  }

  function handleScanResult(code: string) {
    setScannerOpen(false)
    const found = findProduct(code)
    if (found) {
      selectProduct(found)
      toast.success("Artikal pronađen", { description: found.name })
    } else {
      toast.error("Nije pronađeno", {
        description: `Barkod ${code} nije u bazi.`,
      })
    }
  }

  function handleDigit(digit: string) {
    setEntry((prev) => {
      const next = prev === "0" ? digit : prev + digit
      return next.slice(0, 6)
    })
  }

  function handleConfirm() {
    if (!product) return
    confirmCount(product.sku, enteredQty)
    toast.success("Unos potvrđen", {
      description: `${product.name}: ${enteredQty} kom`,
    })
    setProduct(null)
    setEntry("")
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {/* Session header */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {session.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {session.location}
            </span>
          </div>
          {blind ? (
            <Badge className="gap-1.5 bg-primary/15 text-primary ring-1 ring-primary/30">
              <EyeOff className="size-3.5" />
              Slijepi popis
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-border bg-secondary font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {countedSkus}/{totalSkus}
            </Badge>
          )}
        </div>
        <Progress
          value={progress}
          className="[&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-secondary"
        />
      </header>

      {/* Search + scan */}
      <ProductSearch
        onSelect={selectProduct}
        onScanClick={() => setScannerOpen(true)}
      />

      {product ? (
        <>
          {/* Product card */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-lg font-semibold leading-tight text-foreground text-balance">
                  {product.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {product.sku} · {product.barcode}
                </span>
              </div>
              {!blind ? (
                <Badge className="shrink-0 gap-1.5 whitespace-nowrap bg-primary/15 text-primary ring-1 ring-primary/30">
                  Očekivano: {product.expectedQty}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {product.location}
              </span>
              {previous ? (
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle2 className="size-3.5" />
                  Prethodno: {previous.counted}
                </span>
              ) : null}
            </div>
          </div>

          {/* Quantity display */}
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-secondary/40 py-6">
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Prebrojana količina
            </span>
            <span className="font-mono text-6xl font-bold tabular-nums text-foreground">
              {entry === "" ? "0" : entry}
            </span>
            {variance !== null && entry !== "" ? (
              <span
                className={cn(
                  "font-mono text-sm font-medium tabular-nums",
                  variance === 0
                    ? "text-primary"
                    : variance > 0
                      ? "text-foreground/70"
                      : "text-destructive",
                )}
              >
                {variance === 0
                  ? "Slaže se sa očekivanim"
                  : `Razlika: ${variance > 0 ? "+" : ""}${variance}`}
              </span>
            ) : null}
          </div>

          {/* Keypad */}
          <NumericKeypad
            onDigit={handleDigit}
            onBackspace={() => setEntry((prev) => prev.slice(0, -1))}
            onClear={() => setEntry("")}
          />

          {/* Confirm */}
          <Button
            size="lg"
            onClick={handleConfirm}
            className="h-16 w-full rounded-2xl text-lg font-semibold shadow-lg shadow-primary/20"
          >
            <Check data-icon="inline-start" className="size-6" />
            Potvrdi unos
          </Button>
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-card/40 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/30">
            <PackageSearch className="size-7" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-foreground">
              Odaberi artikal
            </span>
            <span className="text-sm text-muted-foreground text-balance">
              Skeniraj barkod ili pretraži po SKU da započneš brojanje.
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => setScannerOpen(true)}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <ScanBarcode data-icon="inline-start" />
            Skeniraj barkod
          </Button>
        </div>
      )}

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onResult={handleScanResult}
      />
    </div>
  )
}
