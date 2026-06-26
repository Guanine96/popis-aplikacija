"use client"

import { useEffect, useRef } from "react"
import { animate } from "framer-motion"

interface AnimatedCounterProps {
  value: number
  className?: string
  format?: (n: number) => string
}

export function AnimatedCounter({
  value,
  className,
  format = (n) => Math.round(n).toLocaleString("sr-RS"),
}: AnimatedCounterProps) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const prevRef = useRef(value)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    const controls = animate(prevRef.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate(latest) {
        node.textContent = format(latest)
      },
      onComplete() {
        prevRef.current = value
      },
    })

    return () => controls.stop()
  }, [value, format])

  return (
    <span ref={nodeRef} className={className}>
      {format(prevRef.current)}
    </span>
  )
}
