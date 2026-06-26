"use client"

import { Delete } from "lucide-react"
import { cn } from "@/lib/utils"

interface NumericKeypadProps {
  onDigit: (digit: string) => void
  onBackspace: () => void
  onClear: () => void
  disabled?: boolean
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]

export function NumericKeypad({
  onDigit,
  onBackspace,
  onClear,
  disabled,
}: NumericKeypadProps) {
  const keyClass = cn(
    "flex items-center justify-center rounded-xl border border-cyan-500/20 bg-zinc-900/80",
    "font-mono text-2xl font-semibold text-cyan-300 tabular-nums select-none",
    "h-16 transition-all active:scale-95 active:bg-cyan-500/20 active:border-cyan-500/50",
    "hover:border-cyan-500/40 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50",
    "disabled:pointer-events-none disabled:opacity-40",
  )

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(digit)}
          className={keyClass}
          aria-label={`Unesi ${digit}`}
        >
          {digit}
        </button>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        className={cn(keyClass, "text-base font-medium text-muted-foreground")}
        aria-label="Obriši sve"
      >
        C
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className={keyClass}
        aria-label="Unesi 0"
      >
        0
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onBackspace}
        className={cn(keyClass, "text-muted-foreground")}
        aria-label="Obriši poslednju cifru"
      >
        <Delete className="size-6" />
      </button>
    </div>
  )
}
