"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  ArrowRight,
  Check,
  EyeOff,
  LogOut,
  ScanBarcode,
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { useInventory } from "@/context/InventoryContext"
import { NumericKeypad } from "@/components/count/numeric-keypad"
import { BarcodeScanner } from "@/components/count/barcode-scanner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PopisMobileView() {
  const { user, logout } = useAuth()
  const {
    session,
    blind,
    popisnaLineCount,
    isLoading,
    getProduct,
    getCountForSku,
    getTargetQty,
    confirmCount,
  } = useInventory()

  const [product, setProduct] = useState<ReturnType<typeof getProduct>>(null)
  const [quantity, setQuantity] = useState("1")
  const [scannerOpen, setScannerOpen] = useState(false)
  const [cameraPromise, setCameraPromise] = useState<Promise<MediaStream> | null>(
    null,
  )
  const [submitting, setSubmitting] = useState(false)
  const autoScanStarted = useRef(false)

  const qty = quantity === "" ? 0 : Number.parseInt(quantity, 10)

  const openScanner = useCallback(() => {
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
  }, [])

  const handleScanResult = useCallback(
    (code: string) => {
      setScannerOpen(false)
      setCameraPromise(null)

      const found = getProduct(code)
      if (found) {
        setProduct(found)
        setQuantity("1")
        toast.success("Artikal pronađen", { description: found.name })
        return
      }

      toast.error("Nije u popisu", {
        description: `Kod ${code} — proverite barkod ili šifru.`,
      })
      window.setTimeout(() => openScanner(), 700)
    },
    [getProduct, openScanner],
  )

  useEffect(() => {
    if (isLoading || autoScanStarted.current || popisnaLineCount === 0) return
    autoScanStarted.current = true
    openScanner()
  }, [isLoading, popisnaLineCount, openScanner])

  async function handleConfirm() {
    if (!product || submitting) return
    if (qty <= 0) {
      toast.error("Unesite količinu veću od 0")
      return
    }

    setSubmitting(true)
    try {
      await confirmCount(product.sku, qty)
      toast.success("Sačuvano", {
        description: `${product.name}: ${qty} kom`,
      })
      setProduct(null)
      setQuantity("1")
      window.setTimeout(() => openScanner(), 350)
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
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center">
        <ScanBarcode className="size-10 animate-pulse text-cyan-500/60" />
        <p className="text-sm text-zinc-400">Učitavam popisnu listu…</p>
      </div>
    )
  }

  if (popisnaLineCount === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center">
        <p className="text-lg font-semibold text-zinc-100">Nema popisne liste</p>
        <p className="text-sm text-zinc-500">
          Predsednik komisije mora prvo uvesti popisnu listu na računaru.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-zinc-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex shrink-0 items-center justify-between border-b border-cyan-500/10 px-4 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            {session.name}
          </p>
          <p className="text-sm font-semibold text-zinc-100">{user?.displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-300">
            {popisnaLineCount} stavki
          </Badge>
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

      {product ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div className="rounded-2xl border border-cyan-500/25 bg-zinc-900/90 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-500/80">
              Artikal
            </p>
            <p className="mt-1 text-xl font-bold leading-snug text-zinc-50">
              {product.name}
            </p>
            <p className="mt-2 font-mono text-xs text-zinc-500">
              Šifra {product.sku}
              {product.barcode ? ` · ${product.barcode}` : ""}
            </p>
            {!blind && getTargetQty(product.sku) > 0 && (
              <p className="mt-2 text-sm text-teal-400">
                Očekivano: {getTargetQty(product.sku)} kom
              </p>
            )}
            {getCountForSku(product.sku) > 0 && (
              <p className="mt-1 text-xs text-cyan-400/80">
                Već popisano: {getCountForSku(product.sku)} kom
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            {[1, 5, 10].map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="ghost"
                onClick={() => setQuantity(String(preset))}
                className={cn(
                  "h-11 min-w-14 rounded-xl font-mono text-lg",
                  quantity === String(preset)
                    ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                    : "text-zinc-500",
                )}
              >
                {preset}
              </Button>
            ))}
          </div>

          <div className="flex flex-col items-center rounded-xl border border-cyan-500/20 bg-zinc-900/50 py-3">
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
              "h-[4.25rem] shrink-0 rounded-2xl text-base font-bold uppercase tracking-wide",
              "bg-teal-500/25 text-teal-200 ring-1 ring-teal-500/50",
              "active:scale-[0.98]",
            )}
          >
            <Check data-icon="inline-start" className="size-6" />
            POTVRDI I SKENIRAJ
            <ArrowRight data-icon="inline-end" className="size-5" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setProduct(null)
              setQuantity("1")
              openScanner()
            }}
            className="text-zinc-500"
          >
            <ScanBarcode data-icon="inline-start" />
            Nazad na skener
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <ScanBarcode className="size-16 text-cyan-500/50" />
          <p className="text-lg font-medium text-zinc-200">Skeniraj sledeći artikal</p>
          <p className="max-w-xs text-sm text-zinc-500">
            Kamera se otvara automatski. Posle potvrde količine vraćate se na skeniranje.
          </p>
          <Button
            onClick={openScanner}
            className="mt-2 h-14 rounded-2xl bg-cyan-500/20 px-8 text-base text-cyan-300 ring-1 ring-cyan-500/40"
          >
            <ScanBarcode data-icon="inline-start" className="size-5" />
            Otvori kameru
          </Button>
        </div>
      )}

      <BarcodeScanner
        open={scannerOpen}
        mediaPromise={cameraPromise}
        onOpenChange={(open) => {
          setScannerOpen(open)
          if (!open) setCameraPromise(null)
        }}
        onResult={handleScanResult}
      />
    </div>
  )
}
