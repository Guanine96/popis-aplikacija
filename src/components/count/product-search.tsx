"use client"

import { useState } from "react"
import { ScanLine, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { searchProducts, type Product } from "@/lib/inventory-data"

interface ProductSearchProps {
  onSelect: (product: Product) => void
  onScanClick: () => void
}

export function ProductSearch({ onSelect, onScanClick }: ProductSearchProps) {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)

  const results = query.trim() ? searchProducts(query).slice(0, 6) : []
  const showResults = focused && query.trim().length > 0 && results.length > 0

  function handleSelect(product: Product) {
    onSelect(product)
    setQuery("")
    setFocused(false)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (results[0]) handleSelect(results[0])
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            inputMode="search"
            autoComplete="off"
            placeholder="Pretraži po SKU ili barkodu"
            aria-label="Pretraga po SKU ili barkodu"
            className={cn(
              "h-12 w-full rounded-xl border border-border/60 bg-secondary/60 pl-10 pr-3",
              "text-base text-foreground placeholder:text-muted-foreground",
              "focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </div>
        <Button
          type="button"
          onClick={onScanClick}
          aria-label="Skeniraj barkod"
          className="h-12 w-12 shrink-0 p-0"
        >
          <ScanLine className="size-6" />
        </Button>
      </form>

      {showResults ? (
        <ul className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-2xl">
          {results.map((product) => (
            <li key={product.sku}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(product)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {product.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {product.sku} · {product.barcode}
                  </span>
                </span>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {product.location}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
