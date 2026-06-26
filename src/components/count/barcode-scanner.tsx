"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { type IScannerControls } from "@zxing/browser"
import { AlertCircle, Keyboard, ScanLine } from "lucide-react"

import {
  createBarcodeReader,
  requestBarcodeCameraStream,
  waitForVideoReady,
} from "@/lib/barcode-camera"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BarcodeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (code: string) => void
  /** Pokreni getUserMedia u istom kliku — obavezno za iOS Safari */
  mediaPromise?: Promise<MediaStream> | null
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onResult,
  mediaPromise,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">(
    "idle",
  )
  const [manual, setManual] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const attachStream = useCallback(
    async (stream: MediaStream) => {
      const video = videoRef.current
      if (!video) return

      streamRef.current = stream
      video.srcObject = stream
      video.setAttribute("playsinline", "true")
      await video.play()

      await waitForVideoReady(video)

      const reader = createBarcodeReader()
      const controls = await reader.decodeFromStream(
        stream,
        video,
        (result) => {
          if (result) onResult(result.getText())
        },
      )
      controlsRef.current = controls
      setStatus("scanning")
    },
    [onResult],
  )

  useEffect(() => {
    if (!open || manual) return

    let cancelled = false
    setStatus("starting")
    setErrorMessage(null)

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera nije podržana. Koristite Chrome ili Safari.")
        }

        const stream = mediaPromise
          ? await mediaPromise
          : await requestBarcodeCameraStream()

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        // Sačekaj da se video element mountuje u dialogu
        for (let i = 0; i < 20; i++) {
          if (videoRef.current) break
          await new Promise((r) => setTimeout(r, 50))
        }

        if (!videoRef.current) {
          throw new Error("Video element nije spreman.")
        }

        await attachStream(stream)
      } catch (error) {
        if (!cancelled) {
          setStatus("error")
          setManual(true)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Dozvolite pristup kameri u podešavanjima pregledača.",
          )
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [open, manual, mediaPromise, attachStream, stopCamera])

  useEffect(() => {
    if (!open) {
      stopCamera()
      setManual(false)
      setManualCode("")
      setStatus("idle")
      setErrorMessage(null)
    }
  }, [open, stopCamera])

  function submitManual(event: React.FormEvent) {
    event.preventDefault()
    const code = manualCode.trim()
    if (code) onResult(code)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-primary" />
            Skeniraj barkod
          </DialogTitle>
          <DialogDescription>
            {manual
              ? "Unesi barkod ili šifru artikla ručno."
              : "Usmeri kameru ka barkodu. Ako nema barkoda, ukucaj šifru."}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && manual ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {manual ? (
          <form onSubmit={submitManual} className="flex flex-col gap-3">
            <input
              autoFocus
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              inputMode="text"
              placeholder="Šifra ili barkod artikla"
              aria-label="Barkod ili šifra"
              className="h-12 w-full rounded-xl border border-border/60 bg-secondary/60 px-4 font-mono text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" disabled={!manualCode.trim()} className="h-12">
              Potvrdi kod
            </Button>
          </form>
        ) : (
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60 bg-black">
            <video
              ref={videoRef}
              className="size-full object-cover"
              muted
              playsInline
              autoPlay
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-1/2 w-3/4">
                {[
                  "left-0 top-0 border-l-2 border-t-2",
                  "right-0 top-0 border-r-2 border-t-2",
                  "bottom-0 left-0 border-b-2 border-l-2",
                  "bottom-0 right-0 border-b-2 border-r-2",
                ].map((pos) => (
                  <span
                    key={pos}
                    className={cn("absolute size-7 border-primary", pos)}
                  />
                ))}
                <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-primary/80 shadow-[0_0_12px] shadow-primary" />
              </div>
            </div>
            {status === "starting" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-muted-foreground">
                Pokretanje kamere…
              </div>
            ) : null}
          </div>
        )}

        {!manual ? (
          <Button
            variant="ghost"
            onClick={() => {
              stopCamera()
              setManual(true)
            }}
            className="text-muted-foreground"
          >
            <Keyboard data-icon="inline-start" />
            Unesi ručno (šifra)
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => {
              setManual(false)
              setErrorMessage(null)
            }}
            className="text-muted-foreground"
          >
            <ScanLine data-icon="inline-start" />
            Pokušaj kameru ponovo
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
