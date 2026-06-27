import Image from "next/image"

import { cn } from "@/lib/utils"

const SIZES = {
  sm: { box: "size-8", img: 26, padding: "p-1" },
  md: { box: "size-9", img: 30, padding: "p-1" },
  lg: { box: "size-14", img: 46, padding: "p-1.5" },
  xl: { box: "size-16", img: 54, padding: "p-2" },
} as const

type AppLogoSize = keyof typeof SIZES

interface AppLogoProps {
  size?: AppLogoSize
  showWordmark?: boolean
  subtitle?: string
  className?: string
  priority?: boolean
}

export function AppLogo({
  size = "md",
  showWordmark = false,
  subtitle = "SaaS inventar",
  className,
  priority = false,
}: AppLogoProps) {
  const s = SIZES[size]

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
          "bg-gradient-to-br from-cyan-500/10 via-zinc-900/90 to-teal-500/10",
          "ring-1 ring-cyan-500/25 shadow-[0_0_16px_rgba(0,240,255,0.1)]",
          s.box,
          s.padding,
        )}
      >
        <Image
          src="/logo.png"
          alt="Popis Robe"
          width={s.img}
          height={s.img}
          priority={priority}
          className="object-contain drop-shadow-[0_0_12px_rgba(0,240,255,0.28)] brightness-110 contrast-[1.04]"
        />
      </span>

      {showWordmark ? (
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-zinc-100">Popis Robe</span>
          <span className="truncate text-[10px] uppercase tracking-[0.25em] text-cyan-500/70">
            {subtitle}
          </span>
        </div>
      ) : null}
    </div>
  )
}
