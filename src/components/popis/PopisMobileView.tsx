"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Check,
  EyeOff,
  LogOut,
  PackageSearch,
  ScanBarcode,
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { useInventory } from "@/context/InventoryContext"
import { NumericKeypad } from "@/components/count/numeric-keypad"
import { BarcodeScanner } from "@/components/count/barcode-scanner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Product } from "@/lib/types"
import { cn } from "@/lib/utils"

export function PopisMobileView() {
  const { user, logout } = useAuth()
  const { session, blind, products, popisnaLineCount, isLoading, getProduct, getCountForSku, getTargetQty, confirmCount } =
    useInventory()
  const [query, setQuery] = useState("")
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)
  const [cameraPromise, setCameraPromise] = useState<Promise<MediaStream> | null>(
    null,
  )
  const [submitting, setSubmitting] = useState(false)

  const qty = quantity === "" ? 0 : Number.parseInt(quantity, 10)

  function selectByQuery(value: string) {
    const found = getProduct(value)
    if (found) {
      setProduct(found)
      setQuery(found.sku)
      toast.success("Artikal pronađen", { description: found.name })
    } else {
      toast.error("Artikal nije pronađen")
    }
  }

  function openScanner() {
    if (navigator.mediaDevices?.getUserMedia) {
      setCameraPromise(
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        }),
      )
    } else {
      setCameraPromise(null)
    }
    setScannerOpen(true)
  }

  async function handleConfirm() {
    if (!product || submitting) return
    if (qty <= 0) {
      toast.error("Unesite količinu veću od 0")
      return
    }
    setSubmitting(true)
    try {
      await confirmCount(product.sku, qty)
      toast.success("Unos potvrđen", {
        description: `${product.name}: ${qty} kom`,
      })
      setProduct(null)
      setQuery("")
      setQuantity("")
    } catch {
      toast.error("Unos nije sačuvan", {
        description: "Proverite internet i pokušajte ponovo.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Učitavanje šifrarnika…
      </div>
    )
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-zinc-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex shrink-0 items-center justify-between border-b border-cyan-500/10 px-4 py-3">
        <div>
          <p className="text-xs text-zinc-500">{session.name}</p>
          <p className="text-sm font-semibold text-zinc-100">
            {user?.displayName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {blind && (
            <Badge className="gap-1 border-teal-500/40 bg-teal-500/10 text-teal-300">
              <EyeOff className="size-3" />
              Slepi
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="text-zinc-500 hover:text-red-400"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && selectByQuery(query)}
            placeholder="Barkod ili šifra artikla"
            className="h-14 flex-1 border-cyan-500/20 bg-zinc-900 text-lg text-zinc-100 placeholder:text-zinc-600"
            autoFocus
          />
          <Button
            size="icon"
            onClick={openScanner}
            className="size-14 shrink-0 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
          >
            <ScanBarcode className="size-6" />
          </Button>
        </div>

        {product ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-zinc-900/80 p-4">
              <p className="text-lg font-semibold leading-tight text-zinc-100">
                {product.name}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-500">
                {product.sku}
                {product.barcode && ` · ${product.barcode}`}
              </p>
              {!blind && getTargetQty(product.sku) > 0 && (
                <p className="mt-2 text-sm text-teal-400">
                  Očekivano (popisna): {getTargetQty(product.sku)} kom
                </p>
              )}
              {getCountForSku(product.sku) > 0 && (
                <p className="mt-1 text-xs text-cyan-400/70">
                  Već popisano: {getCountForSku(product.sku)} kom
                </p>
              )}
            </div>

            <div className="flex flex-col items-center rounded-xl border border-cyan-500/20 bg-zinc-900/50 py-4">
              <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                Količina
              </span>
              <span className="font-mono text-6xl font-bold tabular-nums text-cyan-300">
                {quantity === "" ? "0" : quantity}
              </span>
            </div>

            <div className="min-h-0 flex-1">
              <NumericKeypad
                onDigit={(d) =>
                  setQuantity((p) => (p === "0" ? d : (p + d).slice(0, 6)))
                }
                onBackspace={() => setQuantity((p) => p.slice(0, -1))}
                onClear={() => setQuantity("")}
              />
            </div>

            <Button
              onClick={handleConfirm}
              disabled={submitting || qty <= 0}
              className={cn(
                "h-[4.25rem] shrink-0 rounded-2xl text-base font-bold uppercase tracking-widest sm:text-lg",
                "bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/50",
                "shadow-[0_0_25px_rgba(20,184,166,0.15)] active:scale-[0.98]",
                "hover:bg-teal-500/30",
              )}
            >
              <Check data-icon="inline-start" className="size-6" />
              POTVRDI UNOS
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <PackageSearch className="size-12 text-cyan-500/40" />
            <p className="text-sm text-zinc-500">
              Skenirajte barkod ili unesite šifru artikla
            </p>
            <p className="text-xs text-zinc-600">
              Šifrarnik: {products.length.toLocaleString("sr-RS")} šifri · Popisna
              lista: {popisnaLineCount.toLocaleString("sr-RS")} stavki
            </p>
            <p className="max-w-xs text-xs text-amber-400/80">
              Ako skeniranje ne pronađe artikal, ukucajte šifru (npr. 3, 4, 5) i
              Enter.
            </p>
          </div>
        )}
      </div>

      <BarcodeScanner
        open={scannerOpen}
        mediaPromise={cameraPromise}
        onOpenChange={(open) => {
          setScannerOpen(open)
          if (!open) setCameraPromise(null)
        }}
        onResult={(code) => {
          setScannerOpen(false)
          setCameraPromise(null)
          setQuery(code)
          selectByQuery(code)
        }}
      />
    </div>
  )
}
