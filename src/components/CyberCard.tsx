import { cn } from "@/lib/utils"

interface CyberCardProps {
  children: React.ReactNode
  className?: string
  glow?: "cyan" | "teal" | "red"
}

const glowStyles = {
  cyan: "border-cyan-500/20 shadow-[0_0_20px_rgba(0,240,255,0.06)] hover:shadow-[0_0_30px_rgba(0,240,255,0.12)]",
  teal: "border-teal-500/20 shadow-[0_0_20px_rgba(20,184,166,0.06)] hover:shadow-[0_0_30px_rgba(20,184,166,0.12)]",
  red: "border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.06)]",
}

export function CyberCard({
  children,
  className,
  glow = "cyan",
}: CyberCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-zinc-950/80 backdrop-blur-sm transition-shadow duration-300",
        glowStyles[glow],
        className,
      )}
    >
      {children}
    </div>
  )
}
