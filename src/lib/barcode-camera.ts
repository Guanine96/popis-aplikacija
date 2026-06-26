import { BrowserMultiFormatReader } from "@zxing/browser"
import { BarcodeFormat, DecodeHintType } from "@zxing/library"

const SCAN_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
]

type FocusCapableTrack = MediaStreamTrack & {
  getCapabilities?: () => MediaTrackCapabilities & {
    focusMode?: string[]
    torch?: boolean
  }
}

export function createBarcodeReader() {
  const hints = new Map<DecodeHintType, unknown>()
  hints.set(DecodeHintType.TRY_HARDER, true)
  hints.set(DecodeHintType.POSSIBLE_FORMATS, SCAN_FORMATS)

  return new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 100,
    delayBetweenScanSuccess: 1200,
  })
}

export async function requestBarcodeCameraStream(): Promise<MediaStream> {
  const variants: MediaTrackConstraints[] = [
    {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, min: 15 },
    },
    {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    { facingMode: { ideal: "environment" } },
  ]

  let lastError: unknown
  for (const video of variants) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video })
      await optimizeBarcodeVideoTrack(stream.getVideoTracks()[0])
      return stream
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Kamera nije dostupna.")
}

export async function optimizeBarcodeVideoTrack(track?: MediaStreamTrack) {
  if (!track) return

  const caps = (track as FocusCapableTrack).getCapabilities?.()

  try {
    if (caps?.focusMode?.includes("continuous")) {
      await track.applyConstraints({
        advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
      })
    }
  } catch {
    // focus not supported on this device
  }

  try {
    await track.applyConstraints({
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    })
  } catch {
    // keep negotiated resolution
  }
}

export async function waitForVideoReady(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error("Kamera nije spremna na vreme."))
    }, 8000)

    const onReady = () => {
      if (video.videoWidth > 0) {
        cleanup()
        resolve()
      }
    }

    const cleanup = () => {
      window.clearTimeout(timeout)
      video.removeEventListener("loadedmetadata", onReady)
      video.removeEventListener("canplay", onReady)
    }

    video.addEventListener("loadedmetadata", onReady)
    video.addEventListener("canplay", onReady)
    onReady()
  })
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
}

function getNativeBarcodeDetector(): BarcodeDetectorLike | null {
  if (typeof window === "undefined") return null
  const Detector = (window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike })
    .BarcodeDetector
  if (!Detector) return null

  try {
    return new Detector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
    })
  } catch {
    return null
  }
}

/**
 * Skenira iz punog video kadra (native rezolucija), sa crop-om na središnju zonu
 * gde korisnik drži barkod — bolje čita sitne EAN kodove na telefonu.
 */
export function startHighResBarcodeScan(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
): () => void {
  const reader = createBarcodeReader()
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  const nativeDetector = getNativeBarcodeDetector()

  let active = true
  let busy = false
  let lastCode = ""
  let lastAt = 0

  const tick = async () => {
    if (!active) return

    if (!ctx || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      window.setTimeout(tick, 60)
      return
    }

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh || busy) {
      window.setTimeout(tick, 60)
      return
    }

    const cropW = Math.floor(vw * 0.92)
    const cropH = Math.floor(vh * 0.42)
    const sx = Math.floor((vw - cropW) / 2)
    const sy = Math.floor((vh - cropH) / 2)

    canvas.width = cropW
    canvas.height = cropH
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH)

    busy = true
    try {
      let text: string | null = null

      if (nativeDetector) {
        const hits = await nativeDetector.detect(canvas)
        text = hits[0]?.rawValue ?? null
      }

      if (!text) {
        try {
          text = reader.decodeFromCanvas(canvas).getText()
        } catch {
          text = null
        }
      }

      if (text) {
        const now = Date.now()
        if (text !== lastCode || now - lastAt > 1200) {
          lastCode = text
          lastAt = now
          onCode(text)
        }
      }
    } finally {
      busy = false
      if (active) window.setTimeout(tick, nativeDetector ? 90 : 110)
    }
  }

  void tick()
  return () => {
    active = false
  }
}

export async function setTorch(track: MediaStreamTrack | undefined, enabled: boolean) {
  if (!track) return false

  const caps = (track as FocusCapableTrack).getCapabilities?.()
  if (!caps?.torch) return false

  try {
    await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] })
    return true
  } catch {
    return false
  }
}

export function torchSupported(track?: MediaStreamTrack) {
  if (!track) return false
  const caps = (track as FocusCapableTrack).getCapabilities?.()
  return Boolean(caps?.torch)
}
