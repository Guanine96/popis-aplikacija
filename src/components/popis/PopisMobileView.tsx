"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  ArrowRight,
  Check,
  EyeOff,
  Flashlight,
  Keyboard,
  LogOut,
  ScanBarcode,
  ScanLine,
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { useInventory } from "@/context/InventoryContext"
import { NumericKeypad } from "@/components/count/numeric-keypad"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  requestBarcodeCameraStream,
  setTorch,
  startHighResBarcodeScan,
  torchSupported,
  waitForVideoReady,
} from "@/lib/barcode-camera"

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
  const [submitting, setSubmitting] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "starting" | "scanning" | "error"
  >("idle")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const stopScanRef = useRef<(() => void) | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningPausedRef = useRef(false)

  const qty = quantity === "" ? 0 : Number.parseInt(quantity, 10)

  const stopCamera = useCallback(() => {
    stopScanRef.current?.()
    stopScanRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setTorchOn(false)
    setTorchAvailable(false)
    setCameraStatus("idle")
  }, [])

  const handleScanResult = useCallback(
    (code: string) => {
      if (scanningPausedRef.current) return

      scanningPausedRef.current = true
      setManualMode(false)
      setManualCode("")

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
      window.setTimeout(() => {
        scanningPausedRef.current = false
      }, 800)
    },
    [getProduct],
  )

  const startCamera = useCallback(async () => {
    if (cameraActive || product) return

    setCameraError(null)
    setCameraStatus("starting")

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Kamera nije podržana u ovom pregledaču.")
      }

      const stream = await requestBarcodeCameraStream()
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error("Video nije spreman.")
      }

      streamRef.current = stream
      video.srcObject = stream
      video.setAttribute("playsinline", "true")
      await video.play()
      await waitForVideoReady(video)

      const track = stream.getVideoTracks()[0]
      setTorchAvailable(torchSupported(track))

      stopScanRef.current = startHighResBarcodeScan(video, (code) => {
        handleScanResult(code)
      })

      setCameraActive(true)
      setCameraStatus("scanning")
    } catch (error) {
      stopCamera()
      setCameraStatus("error")
      setManualMode(true)
      setCameraError(
        error instanceof Error
          ? error.message
          : "Dozvolite pristup kameri u podešavanjima pregledača.",
      )
    }
  }, [cameraActive, product, handleScanResult, stopCamera])

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    const next = !torchOn
    const ok = await setTorch(track, next)
    if (ok) setTorchOn(next)
  }, [torchOn])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  function submitManualCode() {
    const code = manualCode.trim()
    if (!code) return
    handleScanResult(code)
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
      toast.success("Sačuvano", {
        description: `${product.name}: ${qty} kom`,
      })
      setProduct(null)
      setQuantity("1")
      scanningPausedRef.current = false
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
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-zinc-950 pt-[env(safe-area-inset-top)]">
      <header className="z-20 flex shrink-0 items-center justify-between border-b border-cyan-500/10 bg-zinc-950 px-4 py-2.5">
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

      <div className="relative min-h-0 flex-1">
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 size-full object-cover",
            product || manualMode ? "pointer-events-none opacity-0" : "opacity-100",
          )}
          muted
          playsInline
          autoPlay
        />

        {!product && !manualMode ? (
          <div className="absolute inset-0 flex flex-col">
            <div className="pointer-events-none flex flex-1 items-center justify-center p-6">
              <div className="relative h-36 w-80 max-w-[92%]">
                {[
                  "left-0 top-0 border-l-2 border-t-2",
                  "right-0 top-0 border-r-2 border-t-2",
                  "bottom-0 left-0 border-b-2 border-l-2",
                  "bottom-0 right-0 border-b-2 border-r-2",
                ].map((pos) => (
                  <span
                    key={pos}
                    className={cn("absolute size-8 border-cyan-400", pos)}
                  />
                ))}
                <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-cyan-400/80" />
              </div>
            </div>

            <div className="shrink-0 space-y-3 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              {cameraActive && torchAvailable ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void toggleTorch()}
                  className={cn(
                    "h-11 w-full rounded-xl",
                    torchOn
                      ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
                      : "text-zinc-300",
                  )}
                >
                  <Flashlight data-icon="inline-start" />
                  {torchOn ? "Blic uključen" : "Uključi blic"}
                </Button>
              ) : null}

              {!cameraActive ? (
                <Button
                  onClick={() => void startCamera()}
                  className="h-14 w-full rounded-2xl bg-cyan-500/25 text-base text-cyan-200 ring-1 ring-cyan-500/50"
                >
                  <ScanLine data-icon="inline-start" className="size-5" />
                  Pokreni kameru
                </Button>
              ) : (
                <p className="text-center text-sm text-cyan-200/90">
                  {cameraStatus === "starting"
                    ? "Pokretanje kamere…"
                    : "Drži barkod u okviru, 15–25 cm od kamere"}
                </p>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  setManualMode(true)
                  setManualCode("")
                }}
                className="h-12 w-full text-zinc-300"
              >
                <Keyboard data-icon="inline-start" />
                Unesi šifru ručno
              </Button>
            </div>
          </div>
        ) : null}

        {!product && manualMode ? (
          <div className="absolute inset-0 flex flex-col bg-zinc-950">
            <div className="flex-1 overflow-y-auto p-4">
              {cameraError ? (
                <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  {cameraError}
                </p>
              ) : null}
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  submitManualCode()
                }}
                className="flex flex-col gap-3"
              >
                <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  Šifra ili barkod
                </label>
                <input
                  autoFocus
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  inputMode="text"
                  placeholder="npr. 7900 ili barkod"
                  className="h-14 w-full rounded-xl border border-cyan-500/25 bg-zinc-900 px-4 font-mono text-lg text-zinc-100 placeholder:text-zinc-600 focus-visible:border-cyan-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                />
              </form>
            </div>

            <div className="shrink-0 space-y-2 border-t border-cyan-500/10 bg-zinc-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                onClick={submitManualCode}
                disabled={!manualCode.trim()}
                className="h-14 w-full rounded-2xl bg-teal-500/25 text-base font-bold text-teal-200 ring-1 ring-teal-500/50"
              >
                <Check data-icon="inline-start" />
                POTVRDI KOD
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setManualMode(false)
                  if (!cameraActive) void startCamera()
                }}
                className="h-11 w-full text-zinc-400"
              >
                <ScanLine data-icon="inline-start" />
                Nazad na kameru
              </Button>
            </div>
          </div>
        ) : null}

        {product ? (
          <div className="absolute inset-0 flex flex-col bg-zinc-950">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-2">
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

              <div className="mt-3 flex items-center justify-center gap-2">
                {[1, 5, 10].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="ghost"
                    onClick={() => setQuantity(String(preset))}
                    className={cn(
                      "h-10 min-w-12 rounded-xl font-mono text-base",
                      quantity === String(preset)
                        ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                        : "text-zinc-500",
                    )}
                  >
                    {preset}
                  </Button>
                ))}
              </div>

              <div className="mt-3 flex flex-col items-center rounded-xl border border-cyan-500/20 bg-zinc-900/50 py-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  Količina
                </span>
                <span className="font-mono text-5xl font-bold tabular-nums text-cyan-300">
                  {quantity === "" ? "0" : quantity}
                </span>
              </div>

              <div className="mt-3">
                <NumericKeypad
                  compact
                  onDigit={(d) =>
                    setQuantity((p) => (p === "0" ? d : (p + d).slice(0, 6)))
                  }
                  onBackspace={() => setQuantity((p) => p.slice(0, -1))}
                  onClear={() => setQuantity("")}
                />
              </div>
            </div>

            <div className="shrink-0 space-y-2 border-t border-cyan-500/10 bg-zinc-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                onClick={handleConfirm}
                disabled={submitting || qty <= 0}
                className={cn(
                  "h-14 w-full rounded-2xl text-base font-bold uppercase tracking-wide",
                  "bg-teal-500/25 text-teal-200 ring-1 ring-teal-500/50",
                  "active:scale-[0.98]",
                )}
              >
                <Check data-icon="inline-start" className="size-5" />
                POTVRDI I SKENIRAJ
                <ArrowRight data-icon="inline-end" className="size-5" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setProduct(null)
                  setQuantity("1")
                  scanningPausedRef.current = false
                }}
                className="h-10 w-full text-zinc-500"
              >
                <ScanBarcode data-icon="inline-start" />
                Nazad na skener
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
