"use client"

import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"
import { Keyboard, ScanLine } from "lucide-react"

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
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onResult,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">(
    "idle",
  )
  const [manual, setManual] = useState(false)
  const [manualCode, setManualCode] = useState("")

  useEffect(() => {
    if (!open || manual) return

    let cancelled = false
    setStatus("starting")

    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (result && !cancelled) {
          onResult(result.getText())
        }
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
        setStatus("scanning")
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error")
          setManual(true)
        }
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [open, manual, onResult])

  // reset when closed
  useEffect(() => {
    if (!open) {
      setManual(false)
      setManualCode("")
      setStatus("idle")
    }
  }, [open])

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
              ? "Unesi barkod ili SKU ručno."
              : "Usmeri kameru ka barkodu artikla."}
          </DialogDescription>
        </DialogHeader>

        {manual ? (
          <form onSubmit={submitManual} className="flex flex-col gap-3">
            <input
              autoFocus
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              inputMode="numeric"
              placeholder="npr. 3850000000017"
              aria-label="Barkod ili SKU"
              className="h-12 w-full rounded-xl border border-border/60 bg-secondary/60 px-4 font-mono text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" disabled={!manualCode.trim()} className="h-12">
              Potvrdi kod
            </Button>
          </form>
        ) : (
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60 bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              className="size-full object-cover"
              muted
              playsInline
            />
            {/* scan reticle */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-1/2 w-3/4">
                {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map(
                  (pos) => (
                    <span
                      key={pos}
                      className={cn("absolute size-7 border-primary", pos)}
                    />
                  ),
                )}
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
            onClick={() => setManual(true)}
            className="text-muted-foreground"
          >
            <Keyboard data-icon="inline-start" />
            Unesi ručno
          </Button>
        ) : status === "error" ? null : (
          <Button
            variant="ghost"
            onClick={() => setManual(false)}
            className="text-muted-foreground"
          >
            <ScanLine data-icon="inline-start" />
            Nazad na kameru
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
